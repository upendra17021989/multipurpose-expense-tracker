package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "festival_coupon_settings")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FestivalCouponSetting {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "festival_event_id", nullable = false) private FestivalEvent festivalEvent;
    @Column(nullable = false, length = 120) private String couponName;
    @Column(nullable = false) private Integer defaultCouponCount;
    @Enumerated(EnumType.STRING) @Column(nullable = false) @Builder.Default private FestivalCouponGenerationStatus generationStatus = FestivalCouponGenerationStatus.DRAFT;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User createdBy;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    @Column(nullable = false) @Builder.Default private LocalDateTime updatedAt = LocalDateTime.now();
    @PreUpdate void updateTimestamp() { updatedAt = LocalDateTime.now(); }
}
