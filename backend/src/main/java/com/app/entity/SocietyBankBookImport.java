package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "society_bank_book_imports")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyBankBookImport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "imported_by_user_id", nullable = false) private User importedBy;
    @Column(nullable = false, unique = true, length = 36) private String batchId;
    @Column(nullable = false) private String fileName;
    @Column(nullable = false, length = 9) private String financialYear;
    @Column(nullable = false) private Integer totalRows;
    @Column(nullable = false) private Integer createdRows;
    @Column(nullable = false) private Integer skippedRows;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal importedAmount;
    @Builder.Default @Column(nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
}
