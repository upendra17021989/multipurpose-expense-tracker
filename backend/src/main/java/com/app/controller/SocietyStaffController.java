package com.app.controller;

import com.app.dto.*;
import com.app.security.UserPrincipal;
import com.app.service.SocietyStaffService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/society/staff")
public class SocietyStaffController {
    private final SocietyStaffService service;
    public SocietyStaffController(SocietyStaffService service) { this.service = service; }
    @GetMapping public List<SocietyStaffDto> list(@AuthenticationPrincipal UserPrincipal p) { return service.getStaff(p.getAccountId()); }
    @GetMapping("/{id}") public SocietyStaffDto get(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long id) { return service.getStaffMember(p.getAccountId(), id); }
    @PostMapping public ResponseEntity<SocietyStaffDto> create(@AuthenticationPrincipal UserPrincipal p, @Valid @RequestBody SocietyStaffRequest r) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(p.getAccountId(), r)); }
    @PutMapping("/{id}") public SocietyStaffDto update(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long id, @Valid @RequestBody SocietyStaffRequest r) { return service.update(p.getAccountId(), id, r); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long id) { service.delete(p.getAccountId(), id); return ResponseEntity.noContent().build(); }
}
