package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "sports_collection_receipts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SportsCollectionReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sports_collection_id", nullable = false)
    private SportsCollection sportsCollection;

    @Column(nullable = false)
    private LocalDate paymentDate;

    @Column(nullable = false)
    private BigDecimal amountPaid;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMode paymentMode;

    private String transactionId;
    private String utr;
    private String chequeNumber;

    @Column(nullable = false)
    private String collectedBy;

    @Column(nullable = false)
    private String receiptNumber;

    private String remarks;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}