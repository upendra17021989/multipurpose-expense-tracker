package com.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierCreateRequest {
    @NotBlank(message = "Supplier name is required")
    private String supplierName;

    @NotBlank(message = "Mobile is required")
    private String mobile;

    private String email;
    private String address;

    @PositiveOrZero(message = "Opening balance cannot be negative")
    private BigDecimal openingBalance;
}
