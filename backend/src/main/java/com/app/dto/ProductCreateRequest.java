package com.app.dto;

import com.app.entity.Unit;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class ProductCreateRequest {
    @NotNull(message = "Product name is required")
    private String productName;

    private String category;

    @NotNull(message = "Unit is required")
    private Unit unit;

    @NotNull(message = "Purchase price is required")
    @Positive(message = "Purchase price must be greater than 0")
    private BigDecimal purchasePrice;

    @NotNull(message = "Selling price is required")
    @Positive(message = "Selling price must be greater than 0")
    private BigDecimal sellingPrice;

    @NotNull(message = "Opening stock is required")
    @PositiveOrZero(message = "Opening stock must be greater than or equal to 0")
    private BigDecimal openingStock;

    private BigDecimal lowStockAlertQty;
    private String barcode;
}
