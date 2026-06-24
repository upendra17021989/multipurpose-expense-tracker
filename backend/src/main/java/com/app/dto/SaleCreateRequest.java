package com.app.dto;

import com.app.entity.PaymentMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
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
public class SaleCreateRequest {
    @NotNull(message = "Sale date is required")
    private LocalDate saleDate;

    private Long customerId;

    @NotNull(message = "Payment mode is required")
    private PaymentMode paymentMode;

    @DecimalMin(value = "0", message = "Discount cannot be negative")
    private BigDecimal discount;

    @DecimalMin(value = "0", message = "Amount paid cannot be negative")
    private BigDecimal amountPaid;

    private String remarks;

    @Valid
    @NotEmpty(message = "At least one sale item is required")
    private List<SaleItemRequest> items;
}
