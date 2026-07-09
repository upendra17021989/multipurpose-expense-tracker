package com.app.dto;

import com.app.entity.*;
import java.time.LocalDateTime;
import lombok.*;

public final class SystemAdminManagementDtos {
    private SystemAdminManagementDtos() {}

    @Value @Builder
    public static class UserRow {
        Long id; String name; String mobile; String email;
        Boolean active; Boolean systemAdmin; LocalDateTime createdAt;
    }

    @Value @Builder
    public static class AccountRow {
        Long id; String accountName; AccountType accountType; Boolean active;
        Long ownerId; String ownerName; String ownerMobile; UserRole ownerRole;
        long activeMembers; LocalDateTime createdAt;
    }

    @Data
    public static class StatusRequest { private boolean active; }

    @Data
    public static class AdminRequest { private boolean systemAdmin; }
}
