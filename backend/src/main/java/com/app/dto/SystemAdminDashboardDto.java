package com.app.dto;

import java.util.Map;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SystemAdminDashboardDto {
    private long totalUsers;
    private long activeUsers;
    private long registrationsLast7Days;
    private long registrationsLast30Days;
    private long totalAccounts;
    private long activeAccounts;
    private Map<String, Long> accountsByType;
    private long totalExpenses;
    private long totalDocuments;
    private long sharedDocuments;
}
