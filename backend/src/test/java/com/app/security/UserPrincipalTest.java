package com.app.security;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class UserPrincipalTest {
    @Test
    void normalUserDoesNotReceiveSystemAdminAuthority() {
        UserPrincipal principal = UserPrincipal.builder().userId(1L).accountId(2L).systemAdmin(false).build();
        assertTrue(principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
        assertFalse(principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMIN")));
    }

    @Test
    void platformAdminReceivesDedicatedAuthority() {
        UserPrincipal principal = UserPrincipal.builder().userId(1L).accountId(2L).systemAdmin(true).build();
        assertTrue(principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMIN")));
    }
}
