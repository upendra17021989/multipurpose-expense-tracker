package com.app.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class FestivalEstimateRequest {
    @NotBlank @Size(max = 200) private String description;
    @NotBlank @Size(max = 100) private String categoryName;
    @Size(max = 200) private String vendorName;
    @NotNull @DecimalMin("0.001") @Digits(integer = 9, fraction = 3) private BigDecimal quantity;
    @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) private BigDecimal unitCost;
    @Size(max = 1000) private String remarks;
}
