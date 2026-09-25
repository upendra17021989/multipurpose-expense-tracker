package com.app.dto;

import com.app.entity.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class FestivalCouponDtos {
    private FestivalCouponDtos() {}

    @Data public static class SettingsRequest {
        @NotBlank @Size(max = 120) private String couponName;
        @NotNull @Min(1) @Max(100) private Integer defaultCouponCount;
    }
    @Data @Builder public static class Settings {
        private Long id; private Long festivalEventId; private String couponName; private Integer defaultCouponCount;
        private FestivalCouponGenerationStatus generationStatus;
    }
    @Data public static class EntitlementRequest { @Min(0) @Max(100) private Integer couponCountOverride; }
    @Data @Builder public static class Eligibility {
        private Long collectionId; private Long flatId; private String blockName; private String flatNumber; private String ownerName;
        private BigDecimal expectedAmount; private BigDecimal collectedAmount; private PaymentStatus paymentStatus;
        private boolean eligible; private Integer couponCountOverride; private int effectiveCouponCount; private long generatedCount;
        private long activeCount; private long usedCount; private boolean discrepancy;
    }
    @Data @Builder public static class Coupon {
        private Long id; private Long collectionId; private Long flatId; private String blockName; private String flatNumber;
        private String ownerName; private String couponName; private String couponNumber; private Integer sequenceNumber;
        private FestivalCouponStatus status; private LocalDateTime generatedAt; private LocalDateTime usedAt; private LocalDateTime cancelledAt;
    }
    @Data @Builder public static class Dashboard {
        private Settings settings; private List<Eligibility> flats; private long eligibleFlats; private long ineligibleFlats;
        private long configuredCoupons; private long generatedCoupons; private long activeCoupons; private long usedCoupons;
        private long discrepancyFlats;
    }
    @Data @Builder public static class GenerationResult {
        private int eligibleFlats; private int createdCoupons; private int existingCoupons; private int skippedFlats;
    }
}
