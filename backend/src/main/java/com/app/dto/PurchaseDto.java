package com.app.dto;

import com.app.entity.PaymentMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseDto {
    private Long id;
    private Long accountId;
    private LocalDate purchaseDate;
    private Long supplierId;
    private String supplierName;
    private String invoiceNumber;
    private BigDecimal totalAmount;
    private BigDecimal discount;
    private BigDecimal netAmount;
    private PaymentMode paymentMode;
    private BigDecimal amountPaid;
    private BigDecimal balanceAmount;
    private String remarks;
    private List<PurchaseItemDto> items;
    private LocalDateTime createdAt;
}
