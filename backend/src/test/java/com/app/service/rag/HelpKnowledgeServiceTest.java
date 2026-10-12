package com.app.service.rag;

import com.app.config.RagProperties;
import com.app.entity.ChatEmbedding;
import com.app.repository.ChatEmbeddingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class HelpKnowledgeServiceTest {
    private ChatEmbeddingRepository repository;
    private OpenAiRagClient provider;
    private RagProperties properties;
    private HelpKnowledgeService service;

    @BeforeEach void setup() throws Exception {
        repository = mock(ChatEmbeddingRepository.class);
        provider = mock(OpenAiRagClient.class);
        properties = new RagProperties();
        service = new HelpKnowledgeService(repository, provider, properties, new ObjectMapper());
    }

    @Test void importQuestionRetrievesImportFirstWithoutUsingAiOrDatabase() {
        var result = service.search("How do I import expenses?", false);
        assertEquals("expense-import", result.get(0).id());
        assertTrue(result.size() <= 3);
        verifyNoInteractions(provider, repository);
    }

    @Test void unrelatedAndStopWordQuestionsAbstain() {
        assertTrue(service.search("quantum nebula astronomy", false).isEmpty());
        assertTrue(service.search("how do I", false).isEmpty());
    }

    @Test void changedContentAndModelAreReembeddedAndThenCached() throws Exception {
        var corpus = MarkdownHelpLoader.load(new ObjectMapper());
        var cached = corpus.stream().map(section -> {
            var embedding = new ChatEmbedding();
            embedding.setId(section.id());
            embedding.setContentHash(HelpKnowledgeService.hash(section.content()));
            embedding.setModel(properties.getEmbeddingModel());
            embedding.setVectorJson("[1,0]");
            return embedding;
        }).toList();
        cached.get(0).setContentHash("old-content");
        cached.get(1).setModel("old-model");
        when(repository.findAllById(any())).thenReturn(cached);
        when(provider.embed(anyList())).thenAnswer(invocation -> {
            List<String> texts = invocation.getArgument(0);
            return texts.stream().map(text -> new double[]{1, 0}).toList();
        });
        when(repository.saveAll(anyList())).thenAnswer(invocation -> {
            List<ChatEmbedding> updates = invocation.getArgument(0);
            for (var update : updates) {
                var entry = cached.stream().filter(value -> value.getId().equals(update.getId())).findFirst().orElseThrow();
                entry.setContentHash(update.getContentHash()); entry.setModel(update.getModel()); entry.setVectorJson(update.getVectorJson());
            }
            return updates;
        });
        assertFalse(service.search("expenses", true).isEmpty());
        verify(repository).saveAll(argThat(updates -> ((List<?>) updates).size() == 2));
        clearInvocations(provider, repository);
        service.search("expenses", true);
        verify(provider).embed(List.of("expenses"));
        verify(repository, never()).saveAll(any());
    }

    @Test void rejectsCorruptVectorsAndReturnsCorrectCosine() {
        assertEquals(1, HelpKnowledgeService.cosine(new double[]{2, 0}, new double[]{1, 0}), 1e-9);
        assertEquals(0, HelpKnowledgeService.cosine(new double[]{0, 1}, new double[]{1, 0}), 1e-9);
        assertThrows(IllegalStateException.class, () -> HelpKnowledgeService.cosine(new double[]{0}, new double[]{1}));
        assertThrows(IllegalStateException.class, () -> HelpKnowledgeService.cosine(new double[]{1}, new double[]{1, 2}));
        assertThrows(IllegalStateException.class, () -> HelpKnowledgeService.cosine(new double[]{Double.NaN}, new double[]{1}));
    }
}
