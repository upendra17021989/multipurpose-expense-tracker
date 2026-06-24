package com.app.dto;

import com.app.entity.TransactionType;
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
public class SupplierPaymentLedgerDto {
    private Long id;
    private Long supplierId;
    private String supplierName;
    private LocalDate transactionDate;
    private TransactionType transactionType;
    private BigDecimal debitAmount;
    private BigDecimal creditAmount;
    private BigDecimal balanceAmount;
    private String paymentMode;
    private String referenceId;
    private String remarks;
    private LocalDateTime createdAt;
}
