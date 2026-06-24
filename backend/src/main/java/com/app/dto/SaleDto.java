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
public class SaleDto {
    private Long id;
    private Long accountId;
    private LocalDate saleDate;
    private Long customerId;
    private String customerName;
    private BigDecimal totalAmount;
    private BigDecimal discount;
    private BigDecimal netAmount;
    private PaymentMode paymentMode;
    private BigDecimal amountPaid;
    private BigDecimal balanceAmount;
    private String remarks;
    private List<SaleItemDto> items;
    private LocalDateTime createdAt;
}
