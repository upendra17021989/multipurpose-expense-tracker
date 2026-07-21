package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "society_journal_lines")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyJournalLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "journal_entry_id", nullable = false) private SocietyJournalEntry journalEntry;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "flat_id") private Flat flat;
    @Column(nullable = false) private Integer lineNumber;
    @Column(nullable = false) private String ledgerName;
    @Column(length = 1000) private String particulars;
    @Builder.Default @Column(nullable = false, precision = 15, scale = 2) private BigDecimal debit = BigDecimal.ZERO;
    @Builder.Default @Column(nullable = false, precision = 15, scale = 2) private BigDecimal credit = BigDecimal.ZERO;
}
