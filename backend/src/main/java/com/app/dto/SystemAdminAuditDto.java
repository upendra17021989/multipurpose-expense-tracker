package com.app.dto;

import java.time.LocalDateTime;
import lombok.*;

@Value @Builder
public class SystemAdminAuditDto {
    Long id;
    Long actorUserId;
    String actorName;
    String action;
    String targetType;
    Long targetId;
    String outcome;
    String ipAddress;
    String metadata;
    LocalDateTime createdAt;
}
