package com.app.controller;

import com.app.dto.ApproveSocietyMembershipRequest;
import com.app.dto.SocietyMembershipRequestDto;
import com.app.dto.SocietyOptionDto;
import com.app.dto.JoinSocietyRequest;
import com.app.dto.UpdateSocietyMemberRoleRequest;
import com.app.security.UserPrincipal;
import com.app.service.SocietyMembershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

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

    @PostMapping("/society/membership-requests")
    public SocietyMembershipRequestDto request(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody JoinSocietyRequest request) {
        return service.requestMembership(request.getSocietyId(), principal.getUserId(), request.getBlockName(), request.getFlatNumber(), request.getRelation());
    }

    @GetMapping("/society/members")
    public List<SocietyMembershipRequestDto> members(@AuthenticationPrincipal UserPrincipal principal) {
        return service.members(principal.getAccountId(), principal.getUserId());
    }

    @PatchMapping("/society/members/{id}/role")
    public SocietyMembershipRequestDto updateRole(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable Long id,
                                                   @Valid @RequestBody UpdateSocietyMemberRoleRequest request) {
        return service.updateRole(principal.getAccountId(), principal.getUserId(), id, request.getRole());
    }

    @PostMapping("/society/membership-requests/{id}/approve")
    public SocietyMembershipRequestDto approve(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable Long id,
                                                @Valid @RequestBody ApproveSocietyMembershipRequest request) {
        return service.approve(principal.getAccountId(), principal.getUserId(), id, request);
    }

    @DeleteMapping("/society/membership-requests/{id}")
    public ResponseEntity<Void> reject(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        service.reject(principal.getAccountId(), principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}

