package com.app.service;

import com.app.dto.SystemAdminDashboardDto;
import com.app.entity.AccountType;
import com.app.repository.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemAdminDashboardService {
    private final UserRepository users;
    private final AccountRepository accounts;
    private final ExpenseRepository expenses;
    private final PersonalDocumentRepository documents;
    private final PersonalDocumentShareRepository documentShares;

    @Transactional(readOnly = true)
    public SystemAdminDashboardDto getDashboard() {
        LocalDateTime now = LocalDateTime.now();
        Map<String, Long> accountsByType = new LinkedHashMap<>();
        for (AccountType type : AccountType.values()) {
            accountsByType.put(type.name(), accounts.countByAccountType(type));
        }
        return SystemAdminDashboardDto.builder()
                .totalUsers(users.count())
                .activeUsers(users.countByActive(true))
                .registrationsLast7Days(users.countByCreatedAtGreaterThanEqual(now.minusDays(7)))
                .registrationsLast30Days(users.countByCreatedAtGreaterThanEqual(now.minusDays(30)))
                .totalAccounts(accounts.count())
                .activeAccounts(accounts.countByActive(true))
                .accountsByType(accountsByType)
                .totalExpenses(expenses.countBySoftDeletedFalse())
                .totalDocuments(documents.count())
                .sharedDocuments(documentShares.countDistinctSharedDocuments())
                .build();
    }
}
