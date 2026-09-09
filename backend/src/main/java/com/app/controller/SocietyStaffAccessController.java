package com.app.controller;

import com.app.dto.GrantSocietyStaffAccessRequest;
import com.app.dto.SocietyStaffAccessDto;
import com.app.dto.UpdateSocietyStaffAccessStatusRequest;
import com.app.dto.AcceptStaffInvitationRequest;
import com.app.dto.SocietyStaffInvitationDto;
import com.app.security.UserPrincipal;
import com.app.service.SocietyStaffAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/society/staff/{staffId}/access")
@RequiredArgsConstructor
public class SocietyStaffAccessController {
    private final SocietyStaffAccessService service;

    @GetMapping
    public ResponseEntity<SocietyStaffAccessDto> get(@AuthenticationPrincipal UserPrincipal principal,
                                                     @PathVariable Long staffId) {
        SocietyStaffAccessDto access = service.get(principal.getAccountId(), principal.getUserId(), staffId);
        return access == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(access);
    }

    @PostMapping
    public ResponseEntity<SocietyStaffAccessDto> grant(@AuthenticationPrincipal UserPrincipal principal,
                                                       @PathVariable Long staffId,
                                                       @RequestBody(required = false) GrantSocietyStaffAccessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.grant(principal.getAccountId(), principal.getUserId(), staffId,
                        request == null ? new GrantSocietyStaffAccessRequest() : request));
    }

    @PatchMapping("/status")
    public SocietyStaffAccessDto updateStatus(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable Long staffId,
                                              @Valid @RequestBody UpdateSocietyStaffAccessStatusRequest request) {
        return service.updateStatus(principal.getAccountId(), principal.getUserId(), staffId, request.getStatus());
    }

    @PostMapping("/invitations")
    public ResponseEntity<SocietyStaffInvitationDto> invite(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long staffId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.invite(principal.getAccountId(), principal.getUserId(), staffId));
    }

    @GetMapping("/invitations/latest")
    public ResponseEntity<SocietyStaffInvitationDto> latest(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long staffId) {
        SocietyStaffInvitationDto result = service.latestInvitation(principal.getAccountId(), principal.getUserId(), staffId);
        return result == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(result);
    }
}
