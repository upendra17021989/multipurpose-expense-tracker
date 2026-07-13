package com.app.service;

import com.app.dto.RegisterRequest;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.User;
import com.app.entity.UserRole;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
import com.app.repository.UserRepository;
import com.app.util.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    private UserRepository users;
    private AccountRepository accounts;
    private AccountUserMembershipRepository memberships;
    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider tokenProvider;
    private ExpenseCategoryService expenseCategoryService;
    private SharedInvitationService sharedInvitationService;
    private AuthService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        accounts = mock(AccountRepository.class);
        memberships = mock(AccountUserMembershipRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        tokenProvider = mock(JwtTokenProvider.class);
        expenseCategoryService = mock(ExpenseCategoryService.class);
        sharedInvitationService = mock(SharedInvitationService.class);
        service = new AuthService(users, accounts, memberships, passwordEncoder, tokenProvider,
                expenseCategoryService, sharedInvitationService);
    }

    @Test
    void registerRejectsExistingMobileWithWorkspaceMessage() {
        when(users.findByMobile("9999999999")).thenReturn(Optional.of(User.builder().id(1L).active(true).build()));

        ValidationException error = assertThrows(ValidationException.class, () -> service.register(RegisterRequest.builder()
                .name("Existing User")
                .mobile("9999999999")
                .email("new@example.com")
                .password("secret123")
                .accountType(AccountType.INDIVIDUAL)
                .accountName("Personal")
                .build()));

        assertTrue(error.getMessage().contains("log in to add or join another workspace"));
    }

    @Test
    void addWorkspaceCreatesAccountAndReturnsSelectedWorkspaceSession() {
        User user = User.builder().id(7L).name("Mira").mobile("9000000000").email("mira@example.com").active(true).build();
        Account saved = Account.builder()
                .id(42L)
                .user(user)
                .accountType(AccountType.SPORTS)
                .accountName("Sunday Cricket")
                .role(UserRole.OWNER)
                .active(true)
                .build();

        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(accounts.save(any(Account.class))).thenReturn(saved);
        when(accounts.findByUserIdAndActive(7L, true)).thenReturn(List.of(saved));
        when(memberships.findByUserIdAndActiveTrue(7L)).thenReturn(List.of());
        when(tokenProvider.generateToken(7L, 42L)).thenReturn("workspace-token");

        var response = service.addWorkspace(7L, 1L, RegisterRequest.builder()
                .accountType(AccountType.SPORTS)
                .accountName("Sunday Cricket")
                .build());

        assertEquals("workspace-token", response.getToken());
        assertEquals(42L, response.getCurrentAccount().getId());
        assertEquals(AccountType.SPORTS, response.getCurrentAccount().getAccountType());
        verify(expenseCategoryService).seedDefaultCategories(saved);
        verify(sharedInvitationService).claimPendingInvitations(user);
    }
}
