package com.app.service.rag;

import com.app.config.RagProperties;
import com.app.dto.ChatRequest;
import com.app.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatServiceTest {
    private RagProperties properties;
    private HelpKnowledgeService knowledge;
    private OpenAiRagClient provider;
    private PersonalExpenseSummaryService summaries;
    private ChatService service;
    private final UserPrincipal principal = UserPrincipal.builder().userId(2L).accountId(1L).build();
    private final ChatRequest request = new ChatRequest(ChatRequest.Mode.HELP, "import expenses", null);
    private final HelpKnowledgeService.Section section = new HelpKnowledgeService.Section("import", "Import", "/expenses", "Review the preview before confirmation.");

    @BeforeEach void setup() {
        properties = new RagProperties(); knowledge = mock(HelpKnowledgeService.class);
        provider = mock(OpenAiRagClient.class); summaries = mock(PersonalExpenseSummaryService.class);
        service = new ChatService(properties, knowledge, provider, summaries);
    }

    @Test void searchModeUsesEvidenceWithoutCallingProvider() {
        when(knowledge.search("import expenses", false)).thenReturn(List.of(section));
        var response = service.chat(principal, request);
        assertEquals("HELP_SEARCH", response.mode());
        assertTrue(response.answer().contains(section.text()));
        assertEquals("/expenses", response.sources().get(0).url());
        verifyNoInteractions(provider, summaries);
    }

    @Test void providerFailureFallsBackToLabeledEvidenceWithoutExposingException() {
        properties.setAiEnabled(true); properties.setApiKey("secret"); properties.setModel("test-model");
        when(knowledge.search("import expenses", true)).thenReturn(List.of(section));
        when(provider.answer(anyString(), anyString())).thenThrow(new IllegalStateException("secret provider body"));
        when(knowledge.lexicalSearch("import expenses")).thenReturn(List.of(section));
        var response = service.chat(principal, request);
        assertEquals("SEARCH_FALLBACK", response.mode());
        assertFalse(response.answer().contains("secret"));
    }

    @Test void noEvidenceSkipsGeneration() {
        when(knowledge.search(anyString(), anyBoolean())).thenReturn(List.of());
        assertEquals("NO_EVIDENCE", service.chat(principal, request).mode());
        verifyNoInteractions(provider);
    }

    @Test void summaryOnlyCallsAuthorizedSummaryService() {
        service.chat(principal, new ChatRequest(ChatRequest.Mode.EXPENSE_SUMMARY, null, "2026-10"));
        verify(summaries).summarize(principal, "2026-10");
        verifyNoInteractions(knowledge, provider);
    }

    @Test void validatesFeatureAuthenticationAndInputs() {
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ChatException.class, () -> service.chat(null, request)).status());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ChatException.class, () -> service.chat(principal,
                new ChatRequest(ChatRequest.Mode.HELP, " ", null))).status());
        properties.setEnabled(false);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, assertThrows(ChatException.class, () -> service.chat(principal, request)).status());
        verifyNoInteractions(knowledge, provider, summaries);
    }

    @Test void perUserRateLimitRejectsEleventhRequestWithoutQueryingSources() {
        when(knowledge.search(anyString(), anyBoolean())).thenReturn(List.of());
        for (int i = 0; i < 10; i++) service.chat(principal, request);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, assertThrows(ChatException.class, () -> service.chat(principal, request)).status());
        verify(knowledge, times(10)).search(anyString(), anyBoolean());
        service.chat(UserPrincipal.builder().userId(3L).accountId(1L).build(), request);
    }
}
