package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "society_annual_collections")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyAnnualCollection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "flat_id") private Flat flat;
    @Column(nullable = false, length = 9) private String financialYear;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SocietyCollectionType collectionType;
    @Column(nullable = false) private String sourceName;
    @Column(nullable = false) private LocalDate paymentDate;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private PaymentMode paymentMode;
    private String referenceNumber;
    @Column(length = 500) private String remarks;
    @Builder.Default @Column(nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
}
