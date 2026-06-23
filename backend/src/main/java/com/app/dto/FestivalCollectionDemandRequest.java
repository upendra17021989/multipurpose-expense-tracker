package com.app.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FestivalCollectionDemandRequest {
    @NotNull(message = "Festival event is required")
    private Long festivalEventId;

    @NotNull(message = "Expected amount is required")
    @DecimalMin(value = "0.01", message = "Expected amount must be greater than 0")
    private BigDecimal expectedAmount;

    private String remarks;
}
