package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "festival_coupon_entitlements")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FestivalCouponEntitlement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "festival_event_id", nullable = false) private FestivalEvent festivalEvent;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "festival_collection_id", nullable = false) private FestivalCollection festivalCollection;
    private Integer couponCountOverride;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    @Column(nullable = false) @Builder.Default private LocalDateTime updatedAt = LocalDateTime.now();
    @PreUpdate void updateTimestamp() { updatedAt = LocalDateTime.now(); }
}
