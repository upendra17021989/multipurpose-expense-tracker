package com.app.dto;

import com.app.entity.PaymentMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseCreateRequest {
    @NotNull(message = "Purchase date is required")
    private LocalDate purchaseDate;

    @NotNull(message = "Supplier is required")
    private Long supplierId;

    @NotBlank(message = "Invoice number is required")
    private String invoiceNumber;

    @NotNull(message = "Payment mode is required")
    private PaymentMode paymentMode;

    @DecimalMin(value = "0", message = "Discount cannot be negative")
    private BigDecimal discount;

    @DecimalMin(value = "0", message = "Amount paid cannot be negative")
    private BigDecimal amountPaid;

    private String remarks;

    @Valid
    @NotEmpty(message = "At least one purchase item is required")
    private List<PurchaseItemRequest> items;
}
