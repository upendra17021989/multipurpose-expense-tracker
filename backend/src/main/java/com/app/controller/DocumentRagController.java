package com.app.controller;

import com.app.dto.ChatResponse;
import com.app.security.UserPrincipal;
import com.app.service.rag.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/personal/documents/{id}/rag")
public class DocumentRagController {
    public record Consent(boolean consent) {}
    public record Question(@NotBlank @Size(max = 2000) String message) {}
    private final PrivateDocumentRagService documents;
    private final ChatService chat;
    public DocumentRagController(PrivateDocumentRagService documents, ChatService chat) {
        this.documents = documents; this.chat = chat;
    }
    @GetMapping public PrivateDocumentRagService.Status status(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return documents.status(principal, id);
    }
    @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.ACCEPTED)
    public PrivateDocumentRagService.Status enable(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id, @RequestBody Consent consent) {
        return documents.enable(principal, id, consent.consent());
    }
    @DeleteMapping @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void disable(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) { documents.disable(principal, id); }
    @PostMapping("/ask") public ChatResponse ask(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id, @Valid @RequestBody Question question) {
        return chat.documentChat(principal, id, question.message(), documents);
    }
    @ExceptionHandler(ChatException.class) public ResponseEntity<Map<String, String>> error(ChatException error) {
        return ResponseEntity.status(error.status()).body(Map.of("message", error.getMessage()));
    }
    @ExceptionHandler({org.springframework.web.bind.MethodArgumentNotValidException.class,
            org.springframework.http.converter.HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, String>> invalidRequest() {
        // Avoid the global validation logger, which includes rejected private question values.
        return ResponseEntity.badRequest().body(Map.of("message", "Provide valid JSON and a document question of 1-2000 characters."));
    }
    @ExceptionHandler(Exception.class) public ResponseEntity<Map<String, String>> unavailable(Exception error) {
        if (error instanceof com.app.exception.ResourceNotFoundException)
            return ResponseEntity.status(404).body(Map.of("message", "Document not found."));
        if (error instanceof com.app.exception.UnauthorizedException)
            return ResponseEntity.status(403).body(Map.of("message", "Document access denied."));
        return ResponseEntity.status(503).body(Map.of("message", "Document assistant unavailable. Please retry."));
    }
}
