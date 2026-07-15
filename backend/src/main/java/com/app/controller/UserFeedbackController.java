package com.app.controller;

import com.app.dto.UserFeedbackDto;
import com.app.dto.UserFeedbackRequest;
import com.app.security.UserPrincipal;
import com.app.service.UserFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/feedback")
@RequiredArgsConstructor
public class UserFeedbackController {
    private final UserFeedbackService service;

    @GetMapping
    public List<UserFeedbackDto> list(@AuthenticationPrincipal UserPrincipal principal) {
        return service.listForUser(principal.getUserId());
    }

    @PostMapping
    public ResponseEntity<UserFeedbackDto> create(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody UserFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getAccountId(), principal.getUserId(), request));
    }
}
