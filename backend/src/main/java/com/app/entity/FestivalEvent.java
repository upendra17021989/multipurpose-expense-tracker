package com.app.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "festival_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FestivalEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(nullable = false)
    private String festivalName;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(precision = 10, scale = 2)
    private BigDecimal budgetAmount;

    @Builder.Default
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal collectedAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalExpense = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal balanceAmount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FestivalEventStatus status = FestivalEventStatus.PLANNED;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (collectedAmount == null) {
            collectedAmount = BigDecimal.ZERO;
        }
        if (totalExpense == null) {
            totalExpense = BigDecimal.ZERO;
        }
        if (status == null) {
            status = FestivalEventStatus.PLANNED;
        }
        recalculateBalance();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        recalculateBalance();
    }

    private void recalculateBalance() {
        BigDecimal collected = collectedAmount != null ? collectedAmount : BigDecimal.ZERO;
        BigDecimal expense = totalExpense != null ? totalExpense : BigDecimal.ZERO;
        balanceAmount = collected.subtract(expense);
    }
}
