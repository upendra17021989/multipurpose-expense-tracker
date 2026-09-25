package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "festival_coupons")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FestivalCoupon {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "festival_event_id", nullable = false) private FestivalEvent festivalEvent;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "festival_collection_id", nullable = false) private FestivalCollection festivalCollection;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "flat_id", nullable = false) private Flat flat;
    @Column(nullable = false, unique = true, length = 100) private String couponNumber;
    @Column(nullable = false) private Integer sequenceNumber;
    @Enumerated(EnumType.STRING) @Column(nullable = false) @Builder.Default private FestivalCouponStatus status = FestivalCouponStatus.ACTIVE;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "generated_by", nullable = false) private User generatedBy;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime generatedAt = LocalDateTime.now();
    private LocalDateTime usedAt;
    private LocalDateTime cancelledAt;
}
