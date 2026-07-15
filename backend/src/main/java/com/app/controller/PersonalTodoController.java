package com.app.controller;

import com.app.dto.*;
import com.app.security.UserPrincipal;
import com.app.service.PersonalTodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/personal/todos")
@RequiredArgsConstructor
public class PersonalTodoController {
    private final PersonalTodoService service;

    @GetMapping public List<PersonalTodoDto> list(@AuthenticationPrincipal UserPrincipal principal) { return service.list(principal.getAccountId()); }
    @PostMapping public ResponseEntity<PersonalTodoDto> create(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody PersonalTodoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getAccountId(), request));
    }
    @PutMapping("/{id}") public PersonalTodoDto update(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id, @Valid @RequestBody PersonalTodoRequest request) { return service.update(principal.getAccountId(), id, request); }
    @PatchMapping("/{id}/completed") public PersonalTodoDto completed(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id, @RequestBody java.util.Map<String, Boolean> body) {
        return service.setCompleted(principal.getAccountId(), id, Boolean.TRUE.equals(body.get("completed")));
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        service.delete(principal.getAccountId(), id); return ResponseEntity.noContent().build();
    }
}
