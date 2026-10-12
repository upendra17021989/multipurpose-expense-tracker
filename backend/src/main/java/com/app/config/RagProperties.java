package com.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.chat")
public class RagProperties {
    private boolean enabled = true;
    private boolean aiEnabled = false;
    private boolean documentsEnabled = false;
    @lombok.ToString.Exclude
    private String apiKey = "";
    private String model = "";
    private String embeddingModel = "text-embedding-3-small";
    private int timeoutSeconds = 20;

    public boolean isAiConfigured() {
        return aiEnabled && apiKey != null && !apiKey.isBlank()
                && model != null && !model.isBlank();
    }
}
