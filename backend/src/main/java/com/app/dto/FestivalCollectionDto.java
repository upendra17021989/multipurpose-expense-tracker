package com.app.dto;

import com.app.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FestivalCollectionDto {
    private Long id;
    private Long accountId;
    private Long festivalEventId;
    private String festivalName;
    private Long flatId;
    private String blockName;
    private String flatNumber;
    private String ownerName;
    private BigDecimal expectedAmount;
    private BigDecimal collectedAmount;
    private BigDecimal pendingAmount;
    private BigDecimal excessAmount;
    private BigDecimal refundedAmount;
    private PaymentStatus paymentStatus;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
