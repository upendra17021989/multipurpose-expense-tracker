package com.app.controller;

import com.app.config.RagProperties;
import com.app.dto.ChatRequest;
import com.app.dto.ChatResponse;
import com.app.security.UserPrincipal;
import com.app.service.rag.ChatException;
import com.app.service.rag.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/chat")
public class ChatController {
    private final ChatService service;
    private final RagProperties properties;
    public ChatController(ChatService service, RagProperties properties) {
        this.service = service; this.properties = properties;
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", properties.isEnabled(), "aiConfigured", properties.isAiConfigured(), "documentsEnabled", properties.isDocumentsEnabled());
    }

    @PostMapping
    public ChatResponse chat(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody ChatRequest request) {
        return service.chat(principal, request);
    }

    @ExceptionHandler(ChatException.class)
    public ResponseEntity<Map<String, String>> error(ChatException error) {
        return ResponseEntity.status(error.status()).body(Map.of("message", error.getMessage()));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> invalidRequest() {
        return ResponseEntity.badRequest().body(Map.of("message", "Provide valid JSON with mode HELP or EXPENSE_SUMMARY."));
    }
}
