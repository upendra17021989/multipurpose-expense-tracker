package com.app.service.rag;

import com.app.config.RagProperties;
import com.app.dto.ChatResponse;
import com.app.entity.*;
import com.app.repository.*;
import com.app.security.UserPrincipal;
import com.app.service.PersonalDocumentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PrivateDocumentRagService {
    public record Status(String status, String error, LocalDateTime updatedAt) {}
    private record Job(Long id, Long owner, Long account, String type, String generation) {}
    private record Match(DocumentTextExtractor.Chunk chunk, double score) {}
    private final PersonalDocumentService documents;
    private final PersonalDocumentRepository source;
    private final AccountRepository accounts;
    private final DocumentRagIndexRepository indexes;
    private final DocumentTextExtractor extractor;
    private final OpenAiRagClient provider;
    private final RagProperties properties;
    private final ObjectMapper mapper;
    private final TransactionTemplate transactions;

    public PrivateDocumentRagService(PersonalDocumentService documents, PersonalDocumentRepository source,
            AccountRepository accounts, DocumentRagIndexRepository indexes, DocumentTextExtractor extractor,
            OpenAiRagClient provider, RagProperties properties, ObjectMapper mapper, PlatformTransactionManager manager) {
        this.documents = documents; this.source = source; this.accounts = accounts; this.indexes = indexes;
        this.extractor = extractor; this.provider = provider; this.properties = properties; this.mapper = mapper;
        this.transactions = new TransactionTemplate(manager);
    }

    private void workspace(UserPrincipal principal) {
        if (principal == null || principal.getUserId() == null || principal.getAccountId() == null)
            throw new ChatException(HttpStatus.FORBIDDEN, "Select your active individual workspace.");
        transactions.executeWithoutResult(ignored -> {
            if (!accounts.existsByIdAndUserIdAndAccountTypeAndActiveTrue(principal.getAccountId(), principal.getUserId(), AccountType.INDIVIDUAL))
                throw new ChatException(HttpStatus.FORBIDDEN, "Select your active individual workspace.");
        });
    }

    private void enabled() {
        if (!properties.isEnabled() || !properties.isDocumentsEnabled())
            throw new ChatException(HttpStatus.SERVICE_UNAVAILABLE, "Private document assistant is disabled.");
    }

    public Status status(UserPrincipal principal, Long id) {
        workspace(principal);
        documents.get(principal.getAccountId(), principal.getUserId(), id);
        return indexes.findById(id).map(value -> new Status(value.getStatus(), value.getError(), value.getUpdatedAt()))
                .orElse(new Status("NOT_INDEXED", null, null));
    }

    public Status enable(UserPrincipal principal, Long id, boolean consent) {
        enabled(); workspace(principal);
        if (!consent) throw new ChatException(HttpStatus.BAD_REQUEST, "Explicit consent to send document text to the AI provider is required.");
        if (!properties.isAiConfigured()) throw new ChatException(HttpStatus.SERVICE_UNAVAILABLE, "AI is not configured.");
        return transactions.execute(ignored -> {
            var document = source.lockById(id).orElseThrow(() -> new ChatException(HttpStatus.NOT_FOUND, "Document not found."));
            if (!principal.getUserId().equals(document.getUploadedBy()))
                throw new ChatException(HttpStatus.NOT_FOUND, "Document not found.");
            documents.get(principal.getAccountId(), principal.getUserId(), id);
            if (!Set.of("application/pdf", "text/plain", "text/markdown").contains(document.getContentType()))
                throw new ChatException(HttpStatus.BAD_REQUEST, "Only PDF and UTF-8 text documents support indexing. OCR is not available.");
            if (document.getFileSize() > DocumentTextExtractor.MAX_BYTES)
                throw new ChatException(HttpStatus.BAD_REQUEST, "Document exceeds the 5 MiB extraction limit.");
            var current = indexes.findById(id).orElse(null);
            if (current != null && Set.of("QUEUED", "PROCESSING").contains(current.getStatus()))
                return new Status(current.getStatus(), current.getError(), current.getUpdatedAt());
            var index = new DocumentRagIndex();
            index.setDocumentId(id); index.setGeneration(UUID.randomUUID().toString());
            index.setStatus("QUEUED"); index.setUpdatedAt(LocalDateTime.now());
            indexes.save(index);
            return new Status("QUEUED", null, index.getUpdatedAt());
        });
    }

    public void disable(UserPrincipal principal, Long id) {
        workspace(principal);
        transactions.executeWithoutResult(ignored -> {
            var document = source.lockById(id).orElseThrow(() -> new ChatException(HttpStatus.NOT_FOUND, "Document not found."));
            if (!principal.getUserId().equals(document.getUploadedBy()))
                throw new ChatException(HttpStatus.NOT_FOUND, "Document not found.");
            indexes.deleteById(id);
        });
    }

    // Durable queue, one job at a time per instance; document row locks prevent duplicate claims.
    @Scheduled(fixedDelay = 5000, initialDelay = 5000)
    public void ingest() {
        if (!properties.isEnabled() || !properties.isDocumentsEnabled() || !properties.isAiConfigured()) return;
        for (var stale : indexes.findByStatusOrderByUpdatedAtAsc("PROCESSING", PageRequest.of(0, 10))) {
            if (stale.getUpdatedAt().isBefore(LocalDateTime.now().minusMinutes(15)))
                fail(stale.getDocumentId(), stale.getGeneration(), "Indexing interrupted. Enable indexing again to retry.");
        }
        for (var candidate : indexes.findByStatusOrderByUpdatedAtAsc("QUEUED", PageRequest.of(0, 1))) {
            Job job = transactions.execute(ignored -> {
                var document = source.lockById(candidate.getDocumentId()).orElse(null);
                var index = indexes.findById(candidate.getDocumentId()).orElse(null);
                if (document == null || index == null || !"QUEUED".equals(index.getStatus())) return null;
                index.setStatus("PROCESSING"); index.setUpdatedAt(LocalDateTime.now()); indexes.save(index);
                return new Job(document.getId(), document.getUploadedBy(), document.getAccount().getId(), document.getContentType(), index.getGeneration());
            });
            if (job != null) process(job);
        }
    }

    private void process(Job job) {
        try {
            var owner = UserPrincipal.builder().userId(job.owner()).accountId(job.account()).build();
            workspace(owner);
            byte[] bytes;
            try (var input = documents.load(job.account(), job.owner(), job.id()).getInputStream()) {
                bytes = input.readNBytes(DocumentTextExtractor.MAX_BYTES + 1);
            }
            var chunks = extractor.extract(bytes, job.type());
            String hash = HelpKnowledgeService.hash(Base64.getEncoder().encodeToString(bytes));
            List<DocumentTextExtractor.Chunk> embedded = new ArrayList<>();
            String model = properties.getEmbeddingModel();
            for (int start = 0; start < chunks.size(); start += 16) {
                if (!current(job.id(), job.generation(), "PROCESSING")) return;
                workspace(owner); documents.get(job.account(), job.owner(), job.id()); enabled();
                var batch = chunks.subList(start, Math.min(start + 16, chunks.size()));
                var vectors = provider.embed(batch.stream().map(DocumentTextExtractor.Chunk::text).toList());
                for (int i = 0; i < batch.size(); i++) {
                    var chunk = batch.get(i);
                    embedded.add(new DocumentTextExtractor.Chunk(chunk.page(), chunk.part(), chunk.text(), vectors.get(i)));
                }
            }
            String json = mapper.writeValueAsString(embedded);
            transactions.executeWithoutResult(ignored -> {
                if (source.lockById(job.id()).isEmpty()) return;
                var index = indexes.findById(job.id()).orElse(null);
                if (index == null || !job.generation().equals(index.getGeneration()) || !"PROCESSING".equals(index.getStatus())) return;
                index.setChunksJson(json); index.setContentHash(hash); index.setEmbeddingModel(model);
                index.setStatus("READY"); index.setError(null); index.setUpdatedAt(LocalDateTime.now()); indexes.save(index);
            });
        } catch (Exception error) {
            // Never persist/log provider bodies, extracted text or filenames.
            fail(job.id(), job.generation(), "Indexing failed. Check file format, extraction limits and provider availability, then retry.");
        }
    }

    private void fail(Long id, String generation, String message) {
        transactions.executeWithoutResult(ignored -> {
            if (source.lockById(id).isEmpty()) return;
            var index = indexes.findById(id).orElse(null);
            if (index != null && generation.equals(index.getGeneration()) && "PROCESSING".equals(index.getStatus())) {
                index.setStatus("FAILED"); index.setError(message); index.setChunksJson(null);
                index.setUpdatedAt(LocalDateTime.now()); indexes.save(index);
            }
        });
    }

    private boolean current(Long id, String generation, String status) {
        // Scalar queries hit the database even when an HTTP request has a cached JPA entity.
        return indexes.countCurrent(id, generation, status) == 1;
    }

    public ChatResponse answer(UserPrincipal principal, Long id, String question) {
        enabled(); workspace(principal);
        if (source.countAccessibleForRag(id, principal.getUserId()) != 1)
            throw new ChatException(HttpStatus.NOT_FOUND, "Document not found.");
        documents.get(principal.getAccountId(), principal.getUserId(), id);
        if (question == null || question.isBlank() || question.length() > 2000)
            throw new ChatException(HttpStatus.BAD_REQUEST, "Enter a document question of 1-2000 characters.");
        var index = indexes.findById(id).filter(value -> "READY".equals(value.getStatus()))
                .orElseThrow(() -> new ChatException(HttpStatus.CONFLICT, "Enable document indexing and wait until it is ready."));
        boolean semantic = properties.isAiConfigured() && properties.getEmbeddingModel().equals(index.getEmbeddingModel());
        List<Match> matches;
        boolean fallback = !semantic;
        try {
            var chunks = List.of(mapper.readValue(index.getChunksJson(), DocumentTextExtractor.Chunk[].class));
            double[] query = null;
            if (semantic) {
                recheck(principal, id, index.getGeneration());
                try { query = provider.embed(List.of(question)).get(0); }
                catch (RuntimeException unavailable) { fallback = true; }
            }
            final double[] vector = query;
            matches = chunks.stream().map(chunk -> new Match(chunk, vector == null ? lexical(question, chunk.text())
                    : HelpKnowledgeService.cosine(vector, chunk.vector())))
                    .filter(match -> vector == null ? match.score() > 0 : match.score() >= 0.35)
                    .sorted(Comparator.comparingDouble(Match::score).reversed()).limit(3).toList();
        } catch (ChatException error) { throw error; }
        catch (Exception error) { throw new ChatException(HttpStatus.CONFLICT, "Document index is invalid. Ask the owner to index it again."); }
        var document = recheck(principal, id, index.getGeneration());
        if (matches.isEmpty()) return new ChatResponse("No matching evidence was found in this document.", "NO_EVIDENCE", List.of(), null);
        var sources = matches.stream().map(match -> new ChatResponse.Source("document-" + id + "-" + match.chunk().page() + "-" + match.chunk().part(),
                document.getTitle() + " / page " + match.chunk().page() + " / part " + match.chunk().part(), "/personal/documents")).toList();
        StringBuilder evidence = new StringBuilder();
        for (int i = 0; i < matches.size(); i++) evidence.append('[').append(i + 1).append("] page ")
                .append(matches.get(i).chunk().page()).append('\n').append(matches.get(i).chunk().text()).append("\n\n");
        String answer;
        String mode = "DOCUMENT_SEARCH";
        if (!fallback) {
            recheck(principal, id, index.getGeneration());
            try { answer = provider.answerDocument(question, evidence.toString()); mode = "DOCUMENT_AI"; }
            catch (RuntimeException unavailable) { answer = evidence.toString().strip(); mode = "DOCUMENT_FALLBACK"; }
        } else { answer = evidence.toString().strip(); mode = "DOCUMENT_FALLBACK"; }
        recheck(principal, id, index.getGeneration()); // Never return an answer after consent/access is revoked.
        return new ChatResponse(answer, mode, sources, null);
    }

    private com.app.dto.PersonalDocumentDto recheck(UserPrincipal principal, Long id, String generation) {
        enabled(); workspace(principal);
        if (source.countAccessibleForRag(id, principal.getUserId()) != 1)
            throw new ChatException(HttpStatus.NOT_FOUND, "Document not found.");
        var document = documents.get(principal.getAccountId(), principal.getUserId(), id);
        if (!current(id, generation, "READY")) throw new ChatException(HttpStatus.CONFLICT, "Document indexing consent or content changed. Ask again after indexing.");
        return document;
    }

    static double lexical(String question, String text) {
        var stop = Set.of("the", "and", "what", "how", "this", "that", "for", "are", "does", "document");
        var terms = new HashSet<>(Arrays.asList(text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")));
        return Arrays.stream(question.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .filter(term -> term.length() > 2 && !stop.contains(term)).distinct().filter(terms::contains).count();
    }
}
