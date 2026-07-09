package com.app.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "system_admin_audit_logs")
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemAdminAuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "actor_user_id") private User actor;
    @Column(nullable = false, length = 80) private String action;
    @Column(nullable = false, length = 40) private String targetType;
    private Long targetId;
    @Column(nullable = false, length = 20) private String outcome;
    @Column(length = 64) private String ipAddress;
    @Column(length = 1000) private String metadata;
    @Builder.Default @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
