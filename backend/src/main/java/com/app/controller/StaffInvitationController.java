package com.app.controller;
import com.app.dto.*;
import com.app.security.UserPrincipal;
import com.app.service.SocietyStaffAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/staff-invitations") @RequiredArgsConstructor
public class StaffInvitationController {
    private final SocietyStaffAccessService service;
    @PostMapping("/accept") public SocietyStaffAccessDto accept(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody AcceptStaffInvitationRequest request) {
        return service.accept(principal.getUserId(), request.getInvitationCode());
    }
}
