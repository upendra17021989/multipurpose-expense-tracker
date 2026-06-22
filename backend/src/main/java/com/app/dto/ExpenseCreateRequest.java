package com.app.dto;

import com.app.entity.PaymentMode;
import com.app.entity.ExpenseStatus;
import com.app.entity.ExpenseType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCreateRequest {
    @NotNull(message = "Expense date is required")
    private LocalDate expenseDate;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    private ExpenseType expenseType;

    private String description;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Payment mode is required")
    private PaymentMode paymentMode;

    private String transactionId;
    private String utr;
    private String chequeNumber;
    private String vendorName;
    private String remarks;
    private Long festivalEventId;
    private ExpenseStatus status;
}
