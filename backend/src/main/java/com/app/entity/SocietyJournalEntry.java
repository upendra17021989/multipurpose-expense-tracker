package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

@Entity @Table(name = "society_journal_entries", uniqueConstraints = @UniqueConstraint(columnNames = {"account_id", "financial_year", "voucher_number"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyJournalEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @Column(nullable = false, length = 9) private String financialYear;
    @Column(nullable = false) private LocalDate entryDate;
    private String referenceNumber;
    @Column(nullable = false) private String voucherType;
    @Column(nullable = false) private String voucherNumber;
    @Column(length = 1000) private String narration;
    @Builder.Default @Column(nullable = false) private String source = "JOURNAL_IMPORT";
    @Builder.Default @Column(nullable = false) private String status = "POSTED";
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by_user_id", nullable = false) private User createdBy;
    @Builder.Default @Column(nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @OneToMany(mappedBy = "journalEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNumber asc") @Builder.Default private List<SocietyJournalLine> lines = new ArrayList<>();
}
