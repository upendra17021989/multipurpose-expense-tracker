package com.app.service;

import com.app.dto.GrantSocietyStaffAccessRequest;
import com.app.entity.*;
import com.app.exception.ValidationException;
import com.app.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SocietyStaffAccessServiceTest {
    private AccountRepository accounts;
    private AccountUserMembershipRepository memberships;
    private SocietyStaffRepository staff;
    private SocietyStaffAccessRepository access;
    private UserRepository users;
    private SocietyStaffAccessService service;

    @BeforeEach
    void setUp() {
        accounts = mock(AccountRepository.class);
        memberships = mock(AccountUserMembershipRepository.class);
        staff = mock(SocietyStaffRepository.class);
        access = mock(SocietyStaffAccessRepository.class);
        users = mock(UserRepository.class);
        service = new SocietyStaffAccessService(accounts, memberships, staff, access, users);
    }

    @Test
    void adminCanGrantSupervisorAccessUsingStaffContact() {
        User admin = User.builder().id(1L).name("Admin").active(true).build();
        User supervisor = User.builder().id(2L).name("Ramesh").mobile("9000000000").active(true).build();
        Account society = Account.builder().id(10L).user(admin).accountType(AccountType.SOCIETY)
                .accountName("Green Society").role(UserRole.ADMIN).active(true).build();
        SocietyStaff staffMember = SocietyStaff.builder().id(20L).account(society).staffName("Ramesh")
                .designation("Supervisor").mobile("9000000000").active(true).build();

        when(accounts.findById(10L)).thenReturn(Optional.of(society));
        when(staff.findByAccountIdAndIdAndActiveTrue(10L, 20L)).thenReturn(Optional.of(staffMember));
        when(users.findById(1L)).thenReturn(Optional.of(admin));
        when(users.findByMobile("9000000000")).thenReturn(Optional.of(supervisor));
        when(memberships.findByAccountIdAndUserId(10L, 2L)).thenReturn(Optional.empty());
        when(access.findByAccountIdAndUserId(10L, 2L)).thenReturn(Optional.empty());
        when(access.findByAccountIdAndStaffId(10L, 20L)).thenReturn(Optional.empty());
        when(access.save(any(SocietyStaffAccess.class))).thenAnswer(invocation -> {
            SocietyStaffAccess saved = invocation.getArgument(0);
            saved.setId(30L);
            return saved;
        });

        var result = service.grant(10L, 1L, 20L, new GrantSocietyStaffAccessRequest());

        assertEquals(30L, result.getId());
        assertEquals(UserRole.STAFF_SUPERVISOR, result.getRole());
        assertEquals(StaffAccessStatus.ACTIVE, result.getStatus());
        assertEquals(2L, result.getUserId());
    }

    @Test
    void nonAdminCannotManageStaffAccess() {
        User owner = User.builder().id(1L).active(true).build();
        Account society = Account.builder().id(10L).user(owner).accountType(AccountType.SOCIETY)
                .accountName("Green Society").role(UserRole.ADMIN).active(true).build();
        when(accounts.findById(10L)).thenReturn(Optional.of(society));
        when(memberships.findByAccountIdAndUserIdAndActiveTrue(10L, 99L)).thenReturn(Optional.empty());

        ValidationException error = assertThrows(ValidationException.class,
                () -> service.grant(10L, 99L, 20L, new GrantSocietyStaffAccessRequest()));

        assertEquals("Only a society admin can manage staff access", error.getMessage());
        verifyNoInteractions(staff, access, users);
    }
}
