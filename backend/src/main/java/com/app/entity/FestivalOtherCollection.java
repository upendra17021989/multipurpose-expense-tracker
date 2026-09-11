package com.app.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "festival_other_collections")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FestivalOtherCollection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "festival_event_id", nullable = false) private FestivalEvent festivalEvent;
    @Column(nullable = false, length = 30) private String sourceType;
    @Column(nullable = false, length = 20) @Builder.Default private String contributionKind = "MONETARY";
    @Column(length = 180) private String contributorName;
    private String contactDetails;
    @Column(length = 180) private String itemName;
    @Column(length = 100) private String quantity;
    @Column(precision = 10, scale = 2) private BigDecimal amount;
    @Column(nullable = false) private LocalDate paymentDate;
    @Enumerated(EnumType.STRING) private PaymentMode paymentMode;
    @Column(length = 180) private String transactionReference;
    @Column(nullable = false, length = 180) private String collectedBy;
    @Column(length = 1000) private String description;
    @Column(nullable = false) @Builder.Default private Boolean specialMention = false;
    @Column(nullable = false) @Builder.Default private Boolean anonymous = false;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by_user_id", nullable = false) private User createdBy;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    @Column(nullable = false) @Builder.Default private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void touch() { updatedAt = LocalDateTime.now(); }
}
