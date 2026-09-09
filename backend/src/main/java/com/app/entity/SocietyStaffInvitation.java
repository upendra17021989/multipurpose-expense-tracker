package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "society_staff_invitations")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyStaffInvitation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "staff_id", nullable = false) private SocietyStaff staff;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "invited_by_user_id", nullable = false) private User invitedBy;
    @Column(nullable = false) private String contact;
    @Column(nullable = false, unique = true, length = 64) private String tokenHash;
    @Column(nullable = false) @Builder.Default private String status = "PENDING";
    @Column(nullable = false) private LocalDateTime expiresAt;
    private LocalDateTime acceptedAt;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
