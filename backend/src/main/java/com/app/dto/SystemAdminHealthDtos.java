package com.app.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.*;

public final class SystemAdminHealthDtos {
    private SystemAdminHealthDtos() {}
    @Value @Builder public static class Health {
        String overallStatus; String application; String version; String databaseStatus;
        String databaseMigration; String storageProvider; String storageStatus;
        Integer databaseActiveConnections; Integer databaseIdleConnections; LocalDateTime checkedAt;
    }
    @Value @Builder public static class UsageRow {
        Long id; String name; long documentCount; long bytes;
    }
    @Value @Builder public static class Storage {
        String provider; String status; long totalDocuments; long totalBytes;
        long missingFiles; long orphanFiles; boolean integrityScanAvailable;
        boolean scanTruncated; List<UsageRow> topOwners; List<UsageRow> topAccounts;
        LocalDateTime checkedAt;
    }
}
