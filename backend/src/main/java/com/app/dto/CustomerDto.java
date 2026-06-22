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
public class CustomerDto {
    private Long id;
    private Long accountId;
    private String customerName;
    private String mobile;
    private String email;
    private String address;
    private BigDecimal openingCredit;
    private BigDecimal currentCredit;
    private Boolean active;
    private LocalDateTime createdAt;
}
