package com.app.dto;

import com.app.entity.AccountType;
import com.app.entity.ExpenseType;
import com.app.entity.PaymentMode;
import com.app.entity.ExpenseStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseDto {
    private Long id;
    private Long accountId;
    private LocalDate expenseDate;
    private AccountType accountType;
    private Long categoryId;
    private String categoryName;
    private ExpenseType expenseType;
    private Long festivalEventId;
    private String vendorName;
    private String description;
    private BigDecimal amount;
    private PaymentMode paymentMode;
    private String transactionId;
    private String utr;
    private String chequeNumber;
    private String paidBy;
    private String approvedBy;
    private String receiptImageUrl;
    private String remarks;
    private ExpenseStatus status;
    private LocalDateTime createdAt;
}
