package com.app.security;

import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.UserRole;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
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

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal)
                || isReadRequest(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        Account account = accountRepository.findById(principal.getAccountId()).orElse(null);
        if (account == null || account.getAccountType() != AccountType.SOCIETY) {
            chain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI().replaceFirst("^/api", "");
        if ("POST".equals(request.getMethod()) && "/society/membership-requests".equals(path)) {
            chain.doFilter(request, response);
            return;
        }
        if (!isSocietyModulePath(path)) {
            chain.doFilter(request, response);
            return;
        }

        UserRole role = resolveRole(account, principal.getUserId());
        boolean permitted = role == UserRole.ADMIN
                || role == UserRole.TREASURER && TREASURER_WRITE_PATHS.stream().anyMatch(path::startsWith);
        if (!permitted) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Your society role does not allow this action\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private UserRole resolveRole(Account account, Long userId) {
        if (account.getUser().getId().equals(userId)) return account.getRole();
        return membershipRepository.findByAccountIdAndUserIdAndActiveTrue(account.getId(), userId)
                .map(membership -> membership.getRole()).orElse(UserRole.MEMBER);
    }

    private boolean isReadRequest(String method) {
        return "GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method);
    }

    private boolean isSocietyModulePath(String path) {
        return path.startsWith("/society") || path.startsWith("/expenses") || path.startsWith("/attachments");
    }
}
