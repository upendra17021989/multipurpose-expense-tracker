package com.app.security;

import com.app.entity.*;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
import com.app.repository.SocietyStaffAccessRepository;
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
        var staffAccess = mock(SocietyStaffAccessRepository.class);
        boolean staffUser = role == UserRole.STAFF_SUPERVISOR || role == UserRole.STAFF;
        long userId = staffUser ? 9L : 1L;
        var account = Account.builder().id(2L).accountType(AccountType.SOCIETY).role(staffUser ? UserRole.ADMIN : role).user(User.builder().id(1L).build()).build();
        when(accounts.findById(2L)).thenReturn(Optional.of(account));
        if (staffUser) {
            when(staffAccess.findByAccountIdAndUserIdAndStatus(2L, 9L, StaffAccessStatus.ACTIVE))
                    .thenReturn(Optional.of(SocietyStaffAccess.builder().role(role).build()));
        }
        var principal = UserPrincipal.builder().userId(userId).accountId(2L).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        var request = new MockHttpServletRequest(method, context + path);
        request.setContextPath(context);
        var response = new MockHttpServletResponse();
        var chain = mock(FilterChain.class);
        new SocietyRoleAccessFilter(accounts, memberships, staffAccess).doFilter(request, response, chain);
        if (permitted) verify(chain).doFilter(request, response);
        else { assertEquals(403, response.getStatus()); verifyNoInteractions(chain); }
    }

    @Test void adminAndSupervisorCanCreateFestival() throws Exception {
        check(UserRole.ADMIN, "POST", "/society/festivals", "/api", true);
        check(UserRole.SUPERVISOR, "POST", "/society/festivals", "/api", true);
        check(UserRole.TREASURER, "POST", "/society/festivals", "/api", false);
        check(UserRole.MEMBER, "POST", "/society/festivals", "/api", false);
    }
    @Test void supervisorCanMaintainSocietyRecords() throws Exception {
        check(UserRole.SUPERVISOR, "POST", "/society/flats", "/api", true);
        check(UserRole.SUPERVISOR, "POST", "/society/journal-book/import", "/api", true);
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
    @Test void staffSupervisorHasLeastPrivilegeOperationalAccess() throws Exception {
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/staff", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/vendors", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/agencies/5/workers", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/agencies", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/attendance", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/attendance/shortages", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/attendance/reports/daily", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/attendance/reports/monthly", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/attendance/bulk", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/work-orders/5", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/work-orders/5/expense-requests", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/work-orders/5/expense-requests", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/expenses/categories", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/notifications", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/notifications/unread-count", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/notifications/8/read", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/notifications/read-all", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/complaints/5", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/society/flats", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/complaints/5/work-order", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/work-orders/5/updates", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/work-orders/5/verify", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/attachments", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/attachments/7/download", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "PUT", "/society/vendors/5", "/api", true);
        check(UserRole.STAFF_SUPERVISOR, "GET", "/expenses", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/flats", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "DELETE", "/society/vendors/5", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "PATCH", "/society/staff/5/access/status", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/staff/5/access/invitations", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "PUT", "/society/membership-requests/5/role", "/api", false);
    }

    @Test void blockRepresentativeCanAddPaymentsButCannotChangeDemands() throws Exception {
        check(UserRole.MEMBER, "POST", "/society/complaints", "/api", true);
        check(UserRole.MEMBER, "POST", "/society/complaints/5/updates", "/api", true);
        check(UserRole.MEMBER, "POST", "/society/complaints/5/work-order", "/api", false);
        check(UserRole.BLOCK_REPRESENTATIVE, "POST", "/society/festival-collections/5/payments", "/api", true);
        check(UserRole.BLOCK_REPRESENTATIVE, "POST", "/society/festival-collections/generate-demand", "/api", false);
        check(UserRole.BLOCK_REPRESENTATIVE, "PUT", "/society/festival-collections/5/demand", "/api", false);
    }

    @Test void dailyReportWritesAreLimitedToAdminsAndSupervisors() throws Exception {
        for (var role : new UserRole[]{UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF_SUPERVISOR}) {
            check(role, "POST", "/society/daily-operations/reports/draft", "/api", true);
            check(role, "POST", "/society/daily-operations/reports/submit", "/api", true);
        }
        for (var role : new UserRole[]{UserRole.TREASURER, UserRole.MEMBER, UserRole.BLOCK_REPRESENTATIVE, UserRole.STAFF}) {
            check(role, "GET", "/society/daily-operations/reports", "/api", true);
            check(role, "POST", "/society/daily-operations/reports/submit", "/api", false);
        }
        check(UserRole.ADMIN, "POST", "/society/daily-operations/reports/7/reopen", "/api", true);
        check(UserRole.SUPERVISOR, "POST", "/society/daily-operations/reports/7/reopen", "/api", false);
        check(UserRole.STAFF_SUPERVISOR, "POST", "/society/daily-operations/reports/7/reopen", "/api", false);
    }

    @Test void onlyAdminCanApproveSocietyExpenses() throws Exception {
        check(UserRole.ADMIN, "POST", "/expenses/5/approve", "/api", true);
        check(UserRole.SUPERVISOR, "POST", "/expenses/5/approve", "/api", false);
        check(UserRole.TREASURER, "POST", "/expenses/5/reject", "/api", false);
    }
}
