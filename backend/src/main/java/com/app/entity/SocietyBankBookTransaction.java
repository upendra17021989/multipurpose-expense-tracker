package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "society_bank_book_transactions", uniqueConstraints = @UniqueConstraint(columnNames = {"account_id", "source_reference"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyBankBookTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "import_id", nullable = false) private SocietyBankBookImport bankImport;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "flat_id") private Flat flat;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "annual_collection_id") private SocietyAnnualCollection annualCollection;
    @Column(nullable = false) private Integer rowNumber;
    @Column(nullable = false) private String sourceReference;
    @Column(nullable = false) private LocalDate transactionDate;
    private String transactionType; private String flatText;
    @Column(length = 1000) private String particulars;
    private String transactionId; private String bankReference; private String voucherNumber; private String settlementId;
    @Column(precision = 15, scale = 2) private BigDecimal debit;
    @Column(precision = 15, scale = 2) private BigDecimal credit;
    @Column(precision = 15, scale = 2) private BigDecimal balance;
    @Builder.Default @Column(nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
}
