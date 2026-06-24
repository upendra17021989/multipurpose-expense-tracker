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
public class CustomerCreateRequest {
    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotBlank(message = "Mobile is required")
    private String mobile;

    private String email;
    private String address;

    @PositiveOrZero(message = "Opening credit cannot be negative")
    private BigDecimal openingCredit;
}
