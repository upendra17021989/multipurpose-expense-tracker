package com.app.controller;

import com.app.dto.SocietyMembershipRequestDto;
import com.app.dto.SocietyOptionDto;
import com.app.security.UserPrincipal;
import com.app.service.SocietyMembershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SocietyMembershipController {
    private final SocietyMembershipService service;

    @GetMapping("/public/societies")
    public List<SocietyOptionDto> societies() { return service.listSocieties(); }

    @GetMapping("/society/membership-requests")
    public List<SocietyMembershipRequestDto> pending(@AuthenticationPrincipal UserPrincipal principal) {
        return service.pending(principal.getAccountId(), principal.getUserId());
    }

    @PostMapping("/society/membership-requests/{id}/approve")
    public SocietyMembershipRequestDto approve(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return service.approve(principal.getAccountId(), principal.getUserId(), id);
    }

    @DeleteMapping("/society/membership-requests/{id}")
    public ResponseEntity<Void> reject(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        service.reject(principal.getAccountId(), principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
