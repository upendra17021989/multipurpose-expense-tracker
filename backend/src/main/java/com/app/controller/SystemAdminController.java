package com.app.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.app.dto.SystemAdminDashboardDto;
import com.app.service.SystemAdminDashboardService;
import com.app.service.SystemAdminManagementService;
import com.app.dto.SystemAdminManagementDtos.*;
import com.app.entity.AccountType;
import com.app.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import com.app.service.SystemAdminAuditService;
import com.app.dto.SystemAdminAuditDto;
import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Supplier;
import com.app.service.SystemAdminHealthService;
import com.app.dto.SystemAdminHealthDtos.*;
import com.app.service.SystemSettingsService;
import com.app.dto.SystemSettingsDto;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/system-admin")
public class SystemAdminController {
    private final SystemAdminDashboardService dashboardService;
    private final SystemAdminManagementService managementService;
    private final SystemAdminAuditService auditService;
    private final SystemAdminHealthService healthService;
    private final SystemSettingsService settingsService;

    public SystemAdminController(SystemAdminDashboardService dashboardService,
            SystemAdminManagementService managementService, SystemAdminAuditService auditService,
            SystemAdminHealthService healthService, SystemSettingsService settingsService) {
        this.dashboardService = dashboardService;
        this.managementService = managementService;
        this.auditService = auditService;
        this.healthService = healthService;
        this.settingsService = settingsService;
    }

    @GetMapping("/access")
    public Map<String, Object> access() {
        return Map.of("authorized", true, "phase", 1);
    }

    @GetMapping("/dashboard")
    public SystemAdminDashboardDto dashboard() {
        return dashboardService.getDashboard();
    }

    @GetMapping("/users")
    public Page<UserRow> users(@RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean active, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return managementService.users(query, active, page, size);
    }

    @PatchMapping("/users/{id}/status")
    public UserRow userStatus(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @RequestBody StatusRequest request, HttpServletRequest http) {
        return audited(principal, "USER_STATUS_CHANGED", "USER", id, http,
                "active=" + request.isActive(),
                () -> managementService.setUserActive(principal.getUserId(), id, request.isActive()));
    }

    @PatchMapping("/users/{id}/system-admin")
    public UserRow systemAdmin(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @RequestBody AdminRequest request, HttpServletRequest http) {
        return audited(principal, "PLATFORM_ADMIN_CHANGED", "USER", id, http,
                "systemAdmin=" + request.isSystemAdmin(),
                () -> managementService.setSystemAdmin(principal.getUserId(), id, request.isSystemAdmin()));
    }

    @GetMapping("/accounts")
    public Page<AccountRow> accounts(@RequestParam(required = false) String query,
            @RequestParam(required = false) AccountType type, @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return managementService.accounts(query, type, active, page, size);
    }

    @PatchMapping("/accounts/{id}/status")
    public AccountRow accountStatus(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @RequestBody StatusRequest request, HttpServletRequest http) {
        return audited(principal, "ACCOUNT_STATUS_CHANGED", "ACCOUNT", id, http,
                "active=" + request.isActive(), () -> managementService.setAccountActive(id, request.isActive()));
    }

    @GetMapping("/audit-logs")
    public Page<SystemAdminAuditDto> auditLogs(@RequestParam(required = false) String query,
            @RequestParam(required = false) String action, @RequestParam(required = false) String outcome,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return auditService.list(query, action, outcome, page, size);
    }

    @GetMapping("/health")
    public Health health() {
        return healthService.health();
    }

    @GetMapping("/storage")
    public Storage storage() {
        return healthService.storage();
    }

    @GetMapping("/settings")
    public SystemSettingsDto settings() {
        return settingsService.get();
    }

    @PutMapping("/settings")
    public SystemSettingsDto updateSettings(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SystemSettingsDto request, HttpServletRequest http) {
        return audited(principal, "SYSTEM_SETTINGS_CHANGED", "SYSTEM", null, http,
                "keys=site_name,support_email,maintenance_notice",
                () -> settingsService.update(principal.getUserId(), request));
    }

    private <T> T audited(UserPrincipal principal, String action, String targetType, Long targetId,
            HttpServletRequest request, String metadata, Supplier<T> operation) {
        try {
            T result = operation.get();
            auditService.record(principal.getUserId(), action, targetType, targetId, "SUCCESS",
                    request.getRemoteAddr(), metadata);
            return result;
        } catch (RuntimeException exception) {
            auditService.record(principal.getUserId(), action, targetType, targetId, "FAILED",
                    request.getRemoteAddr(), metadata);
            throw exception;
        }
    }
}
