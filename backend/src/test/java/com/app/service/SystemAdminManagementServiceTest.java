package com.app.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.app.entity.User;
import com.app.exception.ValidationException;
import com.app.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SystemAdminManagementServiceTest {
    private UserRepository users;
    private SystemAdminManagementService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        service = new SystemAdminManagementService(users, mock(AccountRepository.class),
                mock(AccountUserMembershipRepository.class));
    }

    @Test
    void cannotSuspendOwnUser() {
        when(users.findById(7L)).thenReturn(Optional.of(user(7L, true)));
        assertThrows(ValidationException.class, () -> service.setUserActive(7L, 7L, false));
        verify(users, never()).save(any());
    }

    @Test
    void cannotRemoveFinalActivePlatformAdministrator() {
        when(users.findById(7L)).thenReturn(Optional.of(user(7L, true)));
        when(users.countBySystemAdminTrueAndActiveTrue()).thenReturn(1L);
        assertThrows(ValidationException.class, () -> service.setSystemAdmin(9L, 7L, false));
        verify(users, never()).save(any());
    }

    @Test
    void inactiveUserCannotReceivePlatformAccess() {
        User user = user(7L, false);
        user.setActive(false);
        when(users.findById(7L)).thenReturn(Optional.of(user));
        assertThrows(ValidationException.class, () -> service.setSystemAdmin(9L, 7L, true));
    }

    private User user(Long id, boolean admin) {
        return User.builder().id(id).name("Admin").mobile("9000000000").active(true).systemAdmin(admin).build();
    }
}
