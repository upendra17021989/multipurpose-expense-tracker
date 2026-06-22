package com.app.dto;

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
public class SupplierDto {
    private Long id;
    private Long accountId;
    private String supplierName;
    private String mobile;
    private String email;
    private String address;
    private BigDecimal openingBalance;
    private BigDecimal currentDue;
    private Boolean active;
    private LocalDateTime createdAt;
}
