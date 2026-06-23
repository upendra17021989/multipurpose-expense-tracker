package com.app.dto;

import com.app.entity.PaymentMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FestivalCollectionReceiptDto {
    private Long id;
    private Long festivalCollectionId;
    private LocalDate paymentDate;
    private BigDecimal amountPaid;
    private PaymentMode paymentMode;
    private String transactionId;
    private String utr;
    private String chequeNumber;
    private String collectedBy;
    private String receiptNumber;
    private String receiptPdfUrl;
    private String remarks;
    private LocalDateTime createdAt;
}
