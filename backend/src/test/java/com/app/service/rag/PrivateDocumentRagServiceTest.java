package com.app.service.rag;

import com.app.config.RagProperties;
import com.app.dto.PersonalDocumentDto;
import com.app.entity.*;
import com.app.repository.*;
import com.app.security.UserPrincipal;
import com.app.service.PersonalDocumentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PrivateDocumentRagServiceTest {
    private final PersonalDocumentService documents = mock(PersonalDocumentService.class);
    private final PersonalDocumentRepository source = mock(PersonalDocumentRepository.class);
    private final AccountRepository accounts = mock(AccountRepository.class);
    private final DocumentRagIndexRepository indexes = mock(DocumentRagIndexRepository.class);
    private final OpenAiRagClient provider = mock(OpenAiRagClient.class);
    private final RagProperties properties = new RagProperties();
    private final ObjectMapper mapper = new ObjectMapper();
    private final UserPrincipal principal = UserPrincipal.builder().userId(2L).accountId(1L).build();
    private PrivateDocumentRagService service;
    private DocumentRagIndex index;
    private PersonalDocument document;

    @BeforeEach void setup() throws Exception {
        properties.setDocumentsEnabled(true); properties.setAiEnabled(true); properties.setApiKey("test"); properties.setModel("test-model");
        var account = Account.builder().id(1L).user(User.builder().id(2L).build()).accountType(AccountType.INDIVIDUAL).active(true).build();
        when(accounts.findById(1L)).thenReturn(Optional.of(account));
        when(accounts.existsByIdAndUserIdAndAccountTypeAndActiveTrue(1L, 2L, AccountType.INDIVIDUAL)).thenReturn(true);
        when(source.countAccessibleForRag(5L, 2L)).thenReturn(1L);
        when(indexes.countCurrent(eq(5L), eq("generation"), anyString())).thenAnswer(invocation -> index != null && invocation.getArgument(2).equals(index.getStatus()) ? 1L : 0L);
        document = PersonalDocument.builder().id(5L).account(account).uploadedBy(2L).contentType("text/plain").fileSize(20L).build();
        when(source.lockById(5L)).thenReturn(Optional.of(document));
        when(documents.get(1L, 2L, 5L)).thenReturn(PersonalDocumentDto.builder().id(5L).title("Policy").build());
        var manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        service = new PrivateDocumentRagService(documents, source, accounts, indexes, new DocumentTextExtractor(), provider, properties, mapper, manager);
        index = new DocumentRagIndex(); index.setDocumentId(5L); index.setGeneration("generation"); index.setStatus("READY");
        index.setUpdatedAt(LocalDateTime.now()); index.setEmbeddingModel(properties.getEmbeddingModel());
        index.setChunksJson(mapper.writeValueAsString(List.of(new DocumentTextExtractor.Chunk(2, 1, "Insurance premium 1500", new double[]{1, 0}))));
        when(indexes.findById(5L)).thenReturn(Optional.of(index));
        when(provider.embed(anyList())).thenReturn(List.of(new double[]{1, 0}));
        when(provider.answerDocument(anyString(), anyString())).thenReturn("Premium 1500 [1]");
    }

    @Test void consentIsRequiredAndSharedReadersCannotEnable() {
        assertThrows(ChatException.class, () -> service.enable(principal, 5L, false));
        document.setUploadedBy(99L);
        assertThrows(ChatException.class, () -> service.enable(principal, 5L, true));
        verifyNoInteractions(provider); verify(indexes, never()).save(any());
    }
    @Test void anotherWorkspaceOwnerCannotReadOrSendText() {
        var stranger = UserPrincipal.builder().accountId(1L).userId(99L).build();
        assertThrows(ChatException.class, () -> service.answer(stranger, 5L, "premium"));
        verifyNoInteractions(documents, provider);
    }
    @Test void unauthorizedDocumentCannotReachProvider() {
        when(documents.get(1L, 2L, 5L)).thenThrow(new com.app.exception.ResourceNotFoundException("Document not found"));
        assertThrows(RuntimeException.class, () -> service.answer(principal, 5L, "premium"));
        verifyNoInteractions(provider);
    }
    @Test void readyDocumentReturnsPageSourcesAndRechecksAccess() {
        var response = service.answer(principal, 5L, "premium");
        assertEquals("DOCUMENT_AI", response.mode());
        assertTrue(response.sources().get(0).title().contains("page 2"));
        verify(documents, atLeast(4)).get(1L, 2L, 5L);
        verify(provider).answerDocument(eq("premium"), contains("Insurance premium 1500"));
    }
    @Test void consentRevokedDuringEmbeddingPreventsGeneration() {
        when(provider.embed(anyList())).thenAnswer(ignored -> {
            when(indexes.findById(5L)).thenReturn(Optional.empty());
            when(indexes.countCurrent(anyLong(), anyString(), anyString())).thenReturn(0L);
            return List.of(new double[]{1, 0});
        });
        assertThrows(ChatException.class, () -> service.answer(principal, 5L, "premium"));
        verify(provider, never()).answerDocument(anyString(), anyString());
    }
    @Test void shareRevokedDuringGenerationPreventsReturningAnswer() {
        when(provider.answerDocument(anyString(), anyString())).thenAnswer(ignored -> {
            when(documents.get(1L, 2L, 5L)).thenThrow(new com.app.exception.ResourceNotFoundException("Document not found"));
            return "private answer";
        });
        assertThrows(RuntimeException.class, () -> service.answer(principal, 5L, "premium"));
    }
    @Test void providerFailureUsesAuthorizedExcerpts() {
        when(provider.embed(anyList())).thenThrow(new IllegalStateException("secret provider body"));
        var response = service.answer(principal, 5L, "premium");
        assertEquals("DOCUMENT_FALLBACK", response.mode());
        assertTrue(response.answer().contains("1500")); assertFalse(response.answer().contains("secret"));
        verify(provider, never()).answerDocument(anyString(), anyString());
    }
    @Test void noEvidenceSkipsGeneration() {
        properties.setAiEnabled(false);
        assertEquals("NO_EVIDENCE", service.answer(principal, 5L, "galaxy nebula").mode());
        verifyNoInteractions(provider);
    }
    @Test void explicitEnableQueuesWithoutUploadingImmediately() {
        var result = service.enable(principal, 5L, true);
        assertEquals("QUEUED", result.status()); verifyNoInteractions(provider);
        verify(indexes).save(argThat(value -> value.getChunksJson() == null && value.getGeneration() != null));
    }
    @Test void workerExtractsEmbedsAndPersistsReadyIndex() {
        index.setStatus("QUEUED");
        when(indexes.findByStatusOrderByUpdatedAtAsc(eq("QUEUED"), any())).thenReturn(List.of(index));
        when(documents.load(1L, 2L, 5L)).thenReturn(new ByteArrayResource("Insurance premium 1500".getBytes()));
        service.ingest();
        assertEquals("READY", index.getStatus()); assertNotNull(index.getContentHash());
        assertTrue(index.getChunksJson().contains("1500"));
    }
    @Test void cancelledWorkerDoesNotRecreateIndex() {
        index.setStatus("QUEUED");
        when(indexes.findByStatusOrderByUpdatedAtAsc(eq("QUEUED"), any())).thenReturn(List.of(index));
        when(documents.load(1L, 2L, 5L)).thenReturn(new ByteArrayResource("Insurance premium 1500".getBytes()));
        when(provider.embed(anyList())).thenAnswer(ignored -> { when(indexes.findById(5L)).thenReturn(Optional.empty()); return List.of(new double[]{1, 0}); });
        service.ingest();
        verify(indexes, times(1)).save(any()); // claim only; no late READY write
    }
}
