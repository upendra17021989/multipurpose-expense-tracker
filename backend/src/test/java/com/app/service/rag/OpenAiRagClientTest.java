package com.app.service.rag;

import com.app.config.RagProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class OpenAiRagClientTest {
    private MockRestServiceServer server;
    private OpenAiRagClient client;
    private RagProperties properties;

    @BeforeEach void setup() {
        properties = new RagProperties(); properties.setAiEnabled(true); properties.setApiKey("test-key"); properties.setModel("test-model");
        var builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new OpenAiRagClient(properties, builder.build());
    }

    @Test void embeddingsRespectReturnedIndexes() {
        server.expect(requestTo("https://api.openai.com/v1/embeddings")).andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(jsonPath("$.input[0]").value("first"))
                .andRespond(withSuccess("{\"data\":[{\"index\":1,\"embedding\":[0,1]},{\"index\":0,\"embedding\":[1,0]}]}", MediaType.APPLICATION_JSON));
        var result = client.embed(List.of("first", "second"));
        assertArrayEquals(new double[]{1, 0}, result.get(0));
        assertArrayEquals(new double[]{0, 1}, result.get(1)); server.verify();
    }

    @Test void responsesDoNotStoreAndExtractOnlyMessageText() {
        server.expect(requestTo("https://api.openai.com/v1/responses"))
                .andExpect(jsonPath("$.store").value(false))
                .andExpect(jsonPath("$.model").value("test-model"))
                .andExpect(jsonPath("$.instructions").exists())
                .andRespond(withSuccess("{\"status\":\"completed\",\"output\":[{\"type\":\"reasoning\",\"summary\":[]},{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"Use Import [1].\"}]}]}", MediaType.APPLICATION_JSON));
        assertEquals("Use Import [1].", client.answer("import?", "[1] Import help")); server.verify();
    }

    @Test void incompleteEmbeddingsAndTruncatedAnswersAreRejected() {
        server.expect(requestTo("https://api.openai.com/v1/embeddings"))
                .andRespond(withSuccess("{\"data\":[]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.openai.com/v1/responses"))
                .andRespond(withSuccess("{\"status\":\"incomplete\",\"output\":[]}", MediaType.APPLICATION_JSON));
        assertThrows(IllegalStateException.class, () -> client.embed(List.of("test")));
        assertThrows(IllegalStateException.class, () -> client.answer("test", "evidence")); server.verify();
    }

    @Test void missingConfigurationCannotSendARequest() {
        properties.setApiKey("");
        assertThrows(IllegalStateException.class, () -> client.embed(List.of("test"))); server.verify();
    }
}
