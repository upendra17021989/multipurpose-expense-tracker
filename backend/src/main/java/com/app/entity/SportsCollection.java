package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sports_collections")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SportsCollection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sports_event_id", nullable = false)
    private SportsEvent sportsEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sports_member_id", nullable = false)
    private SportsMember sportsMember;

    @Column(nullable = false)
    private BigDecimal expectedAmount;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal collectedAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal openingDue = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal pendingAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal excessAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal carriedForwardAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal carriedForwardPendingAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    private String remarks;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
