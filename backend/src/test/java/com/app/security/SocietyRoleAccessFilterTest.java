package com.app.security;

import com.app.entity.*;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
import jakarta.servlet.FilterChain;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SocietyRoleAccessFilterTest {
    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    private void check(UserRole role, String method, String path, String context, boolean permitted) throws Exception {
        var accounts = mock(AccountRepository.class);
        var memberships = mock(AccountUserMembershipRepository.class);
        var account = Account.builder().id(2L).accountType(AccountType.SOCIETY).role(role).user(User.builder().id(1L).build()).build();
        when(accounts.findById(2L)).thenReturn(Optional.of(account));
        var principal = UserPrincipal.builder().userId(1L).accountId(2L).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        var request = new MockHttpServletRequest(method, context + path);
        request.setContextPath(context);
        var response = new MockHttpServletResponse();
        var chain = mock(FilterChain.class);
        new SocietyRoleAccessFilter(accounts, memberships).doFilter(request, response, chain);
        if (permitted) verify(chain).doFilter(request, response);
        else { assertEquals(403, response.getStatus()); verifyNoInteractions(chain); }
    }

    @Test void onlyAdminCreatesFestival() throws Exception {
        check(UserRole.ADMIN, "POST", "/society/festivals", "/api", true);
        check(UserRole.TREASURER, "POST", "/society/festivals", "/api", false);
        check(UserRole.MEMBER, "POST", "/society/festivals", "/api", false);
    }
    @Test void trailingSlashAndCustomContextCannotBypassRestriction() throws Exception {
        check(UserRole.TREASURER, "POST", "/society/festivals/", "/custom", false);
        check(UserRole.TREASURER, "POST", "/society/festivals", "", false);
    }
    @Test void treasurerCanStillMaintainFestivalFinances() throws Exception {
        check(UserRole.TREASURER, "POST", "/society/festivals/5/estimates", "/api", true);
        check(UserRole.TREASURER, "POST", "/society/festival-collections/5/payments", "/api", true);
        check(UserRole.TREASURER, "PUT", "/society/festivals/5", "/api", true);
        check(UserRole.MEMBER, "GET", "/society/festivals", "/api", true);
    }
}
