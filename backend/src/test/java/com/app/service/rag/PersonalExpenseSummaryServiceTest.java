package com.app.service.rag;

import com.app.entity.*;
import com.app.repository.AccountRepository;
import com.app.repository.ExpenseRepository;
import com.app.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PersonalExpenseSummaryServiceTest {
    private AccountRepository accounts;
    private ExpenseRepository expenses;
    private PersonalExpenseSummaryService service;
    private Account account;
    private final UserPrincipal principal = UserPrincipal.builder().userId(2L).accountId(1L).build();

    @BeforeEach void setup() {
        accounts = mock(AccountRepository.class); expenses = mock(ExpenseRepository.class);
        service = new PersonalExpenseSummaryService(accounts, expenses);
        account = Account.builder().id(1L).accountType(AccountType.INDIVIDUAL)
                .user(User.builder().id(2L).build()).active(true).build();
        when(accounts.findById(1L)).thenReturn(Optional.of(account));
    }

    @Test void revokedOwnershipInactiveAndSocietyAccountsCannotQueryExpenses() {
        account.setUser(User.builder().id(9L).build());
        assertForbidden();
        account.setUser(User.builder().id(2L).build()); account.setActive(false);
        assertForbidden();
        account.setActive(true); account.setAccountType(AccountType.SOCIETY);
        assertForbidden();
        verifyNoInteractions(expenses);
    }

    private void assertForbidden() {
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ChatException.class, () -> service.summarize(principal, "2026-10")).status());
    }

    @Test void addsExactDecimalsAndUsesAuthenticatedAccountAndMonth() {
        var first = row("Food", "0.10", 1L); var second = row("Travel", "0.20", 2L);
        when(expenses.summarizeForChat(1L, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)))
                .thenReturn(List.of(first, second));
        var result = service.summarize(principal, "2026-10");
        assertEquals(new BigDecimal("0.30"), result.summary().total());
        assertEquals(3, result.summary().count());
        assertTrue(result.summary().scope().contains("rejected"));
    }

    @Test void invalidDatesNeverQueryExpenses() {
        for (String month : List.of("2026-13", "2026-1", "1999-12", "2101-01", "yesterday"))
            assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ChatException.class, () -> service.summarize(principal, month)).status());
        verifyNoInteractions(expenses);
    }

    @Test void missingWorkspaceCannotQueryAccountsOrExpenses() {
        principal.setAccountId(null);
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ChatException.class, () -> service.summarize(principal, "2026-10")).status());
        verifyNoInteractions(accounts, expenses);
    }

    @Test void emptyMonthReturnsZeroAndCorrectLeapYearRange() {
        when(expenses.summarizeForChat(1L, LocalDate.of(2024, 2, 1), LocalDate.of(2024, 2, 29))).thenReturn(List.of());
        var result = service.summarize(principal, "2024-02");
        assertEquals(BigDecimal.ZERO, result.summary().total());
        assertEquals(LocalDate.of(2024, 2, 29), result.summary().endDate());
    }

    private ExpenseRepository.ChatCategoryTotal row(String category, String amount, long count) {
        var row = mock(ExpenseRepository.ChatCategoryTotal.class);
        when(row.getCategory()).thenReturn(category); when(row.getAmount()).thenReturn(new BigDecimal(amount));
        when(row.getEntryCount()).thenReturn(count); return row;
    }
}
