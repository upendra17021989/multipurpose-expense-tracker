package com.app.service.rag;

import com.app.config.RagProperties;
import com.app.dto.ChatRequest;
import com.app.dto.ChatResponse;
import com.app.security.UserPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;

@Service
@Slf4j
public class ChatService {
    private record Window(long minute, int count) {}
    private final RagProperties properties;
    private final HelpKnowledgeService knowledge;
    private final OpenAiRagClient provider;
    private final PersonalExpenseSummaryService summaries;
    private final Map<Long, Window> requests = new HashMap<>();
    private final Semaphore active = new Semaphore(4);

    public ChatService(RagProperties properties, HelpKnowledgeService knowledge,
                       OpenAiRagClient provider, PersonalExpenseSummaryService summaries) {
        this.properties = properties; this.knowledge = knowledge; this.provider = provider; this.summaries = summaries;
    }

    public ChatResponse chat(UserPrincipal principal, ChatRequest request) {
        if (!properties.isEnabled()) throw new ChatException(HttpStatus.SERVICE_UNAVAILABLE, "The assistant is currently disabled.");
        if (principal == null || principal.getUserId() == null)
            throw new ChatException(HttpStatus.UNAUTHORIZED, "Sign in to use the assistant.");
        if (request == null || request.mode() == null)
            throw new ChatException(HttpStatus.BAD_REQUEST, "Select a chat mode.");
        String question = request.message() == null ? "" : request.message().strip();
        if (request.mode() == ChatRequest.Mode.HELP && (question.isBlank() || question.length() > 2000))
            throw new ChatException(HttpStatus.BAD_REQUEST, "Enter a help question of 1–2000 characters.");
        limit(principal.getUserId());
        if (!active.tryAcquire()) throw new ChatException(HttpStatus.TOO_MANY_REQUESTS, "The assistant is busy. Try again shortly.");
        try {
            if (request.mode() == ChatRequest.Mode.EXPENSE_SUMMARY) return summaries.summarize(principal, request.month());
            boolean semantic = properties.isAiConfigured();
            try {
                List<HelpKnowledgeService.Section> sections = knowledge.search(question, semantic);
                if (sections.isEmpty()) return noEvidence();
                if (!semantic) return excerpts(sections, "HELP_SEARCH");
                StringBuilder evidence = new StringBuilder();
                for (int i = 0; i < sections.size(); i++)
                    evidence.append('[').append(i + 1).append("] ").append(sections.get(i).content()).append("\n\n");
                return new ChatResponse(provider.answer(question, evidence.toString()), "AI", sources(sections), null);
            } catch (RuntimeException ex) {
                // Never log provider bodies, keys, user questions or financial records.
                log.warn("Assistant help retrieval/provider unavailable ({})", ex.getClass().getSimpleName());
                List<HelpKnowledgeService.Section> sections = knowledge.lexicalSearch(question);
                return sections.isEmpty() ? noEvidence() : excerpts(sections, "SEARCH_FALLBACK");
            }
        } finally { active.release(); }
    }

    private ChatResponse noEvidence() {
        return new ChatResponse("I couldn't find enough information in the site help to answer that. "
                + "Ask about a specific feature, or choose Expense summary for a personal spending total.",
                "NO_EVIDENCE", List.of(), null);
    }

    private ChatResponse excerpts(List<HelpKnowledgeService.Section> sections, String mode) {
        StringBuilder answer = new StringBuilder(mode.equals("SEARCH_FALLBACK")
                ? "AI help is temporarily unavailable. Here are matching help sections:\n\n"
                : "Here are matching help sections:\n\n");
        for (int i = 0; i < sections.size(); i++)
            answer.append('[').append(i + 1).append("] ").append(sections.get(i).title()).append('\n')
                    .append(sections.get(i).text()).append("\n\n");
        return new ChatResponse(answer.toString().strip(), mode, sources(sections), null);
    }

    private List<ChatResponse.Source> sources(List<HelpKnowledgeService.Section> sections) {
        return sections.stream().map(section -> new ChatResponse.Source(section.id(), section.title(), section.url())).toList();
    }

    private synchronized void limit(Long userId) {
        long minute = Instant.now().getEpochSecond() / 60;
        if (requests.size() > 1000) requests.entrySet().removeIf(entry -> entry.getValue().minute() < minute);
        Window window = requests.get(userId);
        if (window == null || window.minute() != minute) {
            if (requests.size() >= 10000 && window == null)
                throw new ChatException(HttpStatus.TOO_MANY_REQUESTS, "The assistant is busy. Try again shortly.");
            window = new Window(minute, 0);
        }
        if (window.count() >= 10) throw new ChatException(HttpStatus.TOO_MANY_REQUESTS,
                "You can send 10 requests per minute. Please wait before trying again.");
        requests.put(userId, new Window(minute, window.count() + 1));
    }

    public ChatResponse documentChat(UserPrincipal principal, Long id, String question, PrivateDocumentRagService documents) {
        if (!properties.isEnabled()) throw new ChatException(HttpStatus.SERVICE_UNAVAILABLE, "The assistant is currently disabled.");
        if (principal == null || principal.getUserId() == null) throw new ChatException(HttpStatus.UNAUTHORIZED, "Sign in to use the assistant.");
        if (question == null || question.isBlank() || question.length() > 2000)
            throw new ChatException(HttpStatus.BAD_REQUEST, "Enter a document question of 1-2000 characters.");
        limit(principal.getUserId());
        if (!active.tryAcquire()) throw new ChatException(HttpStatus.TOO_MANY_REQUESTS, "The assistant is busy. Try again shortly.");
        try { return documents.answer(principal, id, question.strip()); }
        finally { active.release(); }
    }
}
