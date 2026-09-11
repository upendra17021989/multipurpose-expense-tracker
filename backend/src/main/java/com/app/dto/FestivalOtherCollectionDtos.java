package com.app.dto;

import com.app.entity.PaymentMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class FestivalOtherCollectionDtos {
    private FestivalOtherCollectionDtos() {}

    @Data
    public static class Request {
        @NotBlank private String sourceType;
        @NotBlank private String contributionKind;
        @Size(max = 180) private String contributorName;
        @Size(max = 255) private String contactDetails;
        @Size(max = 180) private String itemName;
        @Size(max = 100) private String quantity;
        @DecimalMin("0.01") private BigDecimal amount;
        @NotNull private LocalDate paymentDate;
        private PaymentMode paymentMode;
        @Size(max = 180) private String transactionReference;
        @NotBlank @Size(max = 180) private String collectedBy;
        @Size(max = 1000) private String description;
        private Boolean specialMention;
        private Boolean anonymous;
    }

    @Data
    @Builder
    public static class Dto {
        private Long id;
        private Long festivalEventId;
        private String sourceType;
        private String contributionKind;
        private String contributorName;
        private String contactDetails;
        private String itemName;
        private String quantity;
        private BigDecimal amount;
        private LocalDate paymentDate;
        private PaymentMode paymentMode;
        private String transactionReference;
        private String collectedBy;
        private String description;
        private Boolean specialMention;
        private Boolean anonymous;
        private String createdBy;
        private LocalDateTime createdAt;
    }
}
