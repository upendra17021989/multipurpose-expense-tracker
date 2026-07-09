package com.app.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.app.entity.AccountType;
import com.app.repository.*;
import org.junit.jupiter.api.Test;

class SystemAdminDashboardServiceTest {
    @Test
    void returnsOnlyAggregatePlatformStatistics() {
        UserRepository users = mock(UserRepository.class);
        AccountRepository accounts = mock(AccountRepository.class);
        ExpenseRepository expenses = mock(ExpenseRepository.class);
        PersonalDocumentRepository documents = mock(PersonalDocumentRepository.class);
        PersonalDocumentShareRepository shares = mock(PersonalDocumentShareRepository.class);
        when(users.count()).thenReturn(12L);
        when(users.countByActive(true)).thenReturn(10L);
        when(users.countByCreatedAtGreaterThanEqual(any())).thenReturn(3L, 7L);
        when(accounts.count()).thenReturn(8L);
        when(accounts.countByActive(true)).thenReturn(6L);
        when(accounts.countByAccountType(AccountType.INDIVIDUAL)).thenReturn(4L);
        when(expenses.countBySoftDeletedFalse()).thenReturn(90L);
        when(documents.count()).thenReturn(14L);
        when(shares.countDistinctSharedDocuments()).thenReturn(2L);

        var result = new SystemAdminDashboardService(users, accounts, expenses, documents, shares).getDashboard();

        assertEquals(12L, result.getTotalUsers());
        assertEquals(10L, result.getActiveUsers());
        assertEquals(4L, result.getAccountsByType().get("INDIVIDUAL"));
        assertEquals(90L, result.getTotalExpenses());
        assertEquals(2L, result.getSharedDocuments());
        verify(accounts, times(AccountType.values().length)).countByAccountType(any());
    }
}
