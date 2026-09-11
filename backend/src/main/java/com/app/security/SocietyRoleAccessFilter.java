package com.app.security;

import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.UserRole;
import com.app.entity.StaffAccessStatus;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
import com.app.repository.SocietyStaffAccessRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SocietyRoleAccessFilter extends OncePerRequestFilter {
    private static final List<String> TREASURER_WRITE_PATHS = List.of(
            "/expenses", "/attachments", "/society/annual-collections",
            "/society/festival-collections", "/society/festivals"
    );

    private final AccountRepository accountRepository;
    private final AccountUserMembershipRepository membershipRepository;
    private final SocietyStaffAccessRepository staffAccessRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal)) {
            chain.doFilter(request, response);
            return;
        }

        Account account = accountRepository.findById(principal.getAccountId()).orElse(null);
        if (account == null || account.getAccountType() != AccountType.SOCIETY) {
            chain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI().substring(request.getContextPath().length()).replaceAll("/+$", "");
        if ("POST".equals(request.getMethod()) && "/society/membership-requests".equals(path)) {
            chain.doFilter(request, response);
            return;
        }
        if (!isSocietyModulePath(path)) {
            chain.doFilter(request, response);
            return;
        }

        UserRole role = resolveRole(account, principal.getUserId());
        if (role == null) {
            deny(response, "Your society access is no longer active");
            return;
        }
        if (role == UserRole.STAFF_SUPERVISOR) {
            if (!staffSupervisorPermitted(request.getMethod(), path)) {
                deny(response, "Your staff supervisor role does not allow this action");
                return;
            }
            chain.doFilter(request, response);
            return;
        }
        if (role == UserRole.STAFF) {
            if (path.equals("/society/attendance/self") && (isReadRequest(request.getMethod()) || "POST".equals(request.getMethod()))) {
                chain.doFilter(request, response);
            } else {
                deny(response, "Worker self-service access is limited to the worker's own attendance");
            }
            return;
        }
        if (!isReadRequest(request.getMethod()) && path.matches("/society/daily-operations/reports/\\d+/acknowledge")
                && role != UserRole.ADMIN) {
            deny(response, "Only a society admin can acknowledge a daily report");
            return;
        }
        if (!isReadRequest(request.getMethod()) && path.startsWith("/society/daily-operations/checklist/templates")
                && role != UserRole.ADMIN) {
            deny(response, "Only a society admin can configure daily checklist items");
            return;
        }
        if (!isReadRequest(request.getMethod())
                && path.matches("/society/work-orders/\\d+/(?:verify|reopen)")
                && role != UserRole.ADMIN) {
            deny(response, "Only a society admin can verify or reopen completed work");
            return;
        }
        if ("POST".equals(request.getMethod()) && path.matches("/expenses/\\d+/(?:approve|reject)")
                && role != UserRole.ADMIN) {
            deny(response, "Only a society admin can approve or reject expenses");
            return;
        }
        if (isReadRequest(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        boolean creatingFestival = "POST".equals(request.getMethod()) && "/society/festivals".equals(path);
        boolean addingFestivalPayment = "POST".equals(request.getMethod())
                && path.matches("/society/festival-collections/\\d+/payments");
        boolean managingStaffAccess = path.matches("/society/staff/\\d+/access(?:/status|/invitations(?:/latest)?)?");
        boolean managingMembershipRoles = path.startsWith("/society/membership-requests");
        boolean complaintSelfService = "POST".equals(request.getMethod())
                && (path.equals("/society/complaints") || path.matches("/society/complaints/\\d+/updates"));
        boolean notificationSelfService = "POST".equals(request.getMethod())
                && (path.equals("/society/notifications/read-all") || path.matches("/society/notifications/\\d+/read"));
        boolean permitted = complaintSelfService || notificationSelfService || role == UserRole.ADMIN || role == UserRole.SUPERVISOR
                || !creatingFestival && role == UserRole.TREASURER && TREASURER_WRITE_PATHS.stream().anyMatch(path::startsWith)
                || role == UserRole.BLOCK_REPRESENTATIVE && addingFestivalPayment;
        if (!permitted) {
            deny(response, "Your society role does not allow this action");
            return;
        }
        chain.doFilter(request, response);
    }

    private UserRole resolveRole(Account account, Long userId) {
        if (account.getUser().getId().equals(userId)) return account.getRole();
        return membershipRepository.findByAccountIdAndUserIdAndActiveTrue(account.getId(), userId)
                .map(membership -> membership.getRole() == UserRole.MEMBER
                        && "Committee member".equalsIgnoreCase(membership.getRequestedRelation())
                        ? UserRole.BLOCK_REPRESENTATIVE : membership.getRole())
                .or(() -> staffAccessRepository.findByAccountIdAndUserIdAndStatus(
                        account.getId(), userId, StaffAccessStatus.ACTIVE).map(access -> access.getRole()))
                .orElse(null);
    }

    private boolean staffSupervisorPermitted(String method, String path) {
        if ("GET".equals(method) || "HEAD".equals(method)) {
            return path.startsWith("/society/daily-operations") || path.matches("/attachments(?:/\\d+/download)?") || path.equals("/expenses/categories") || path.matches("/society/notifications(?:/unread-count)?") || path.matches("/society/complaints(?:/\\d+)?") || path.matches("/society/staff(?:/\\d+)?") || path.matches("/society/vendors(?:/\\d+)?") || path.matches("/society/agencies(?:/\\d+)?(?:/workers(?:/\\d+)?)?") || path.matches("/society/shifts(?:/\\d+)?") || path.matches("/society/roster-assignments(?:/\\d+)?") || path.matches("/society/attendance(?:/shortages|/reports/(?:daily|monthly))?") || path.equals("/society/attendance-workflow/status") || path.matches("/society/work-orders(?:/\\d+(?:/expense-requests)?)?");
        }
        return path.startsWith("/society/daily-operations") || "PUT".equals(method) && path.matches("/society/vendors/\\d+") || "POST".equals(method) && (path.equals("/attachments") || path.equals("/society/notifications/read-all") || path.matches("/society/notifications/\\d+/read") || path.equals("/society/complaints") || path.matches("/society/complaints/\\d+/(?:updates|work-order)") || path.equals("/society/attendance/bulk") || path.equals("/society/attendance-workflow/submit") || path.matches("/society/attendance-workflow/\\d+/corrections") || path.equals("/society/work-orders") || path.matches("/society/work-orders/\\d+/(?:assignments|updates|complete|expense-requests)")) || "DELETE".equals(method) && path.matches("/attachments/\\d+");
    }

    private void deny(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"" + message + "\"}");
    }

    private boolean isReadRequest(String method) {
        return "GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method);
    }

    private boolean isSocietyModulePath(String path) {
        return path.startsWith("/society") || path.startsWith("/expenses") || path.startsWith("/attachments");
    }
}
