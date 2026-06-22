package com.app.dto;

import com.app.entity.Unit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDto {
    private Long id;
    private Long accountId;
    private String productName;
    private String category;
    private Unit unit;
    private BigDecimal purchasePrice;
    private BigDecimal sellingPrice;
    private BigDecimal openingStock;
    private BigDecimal currentStock;
    private BigDecimal lowStockAlertQty;
    private String barcode;
    private Boolean active;
    private LocalDateTime createdAt;
}
