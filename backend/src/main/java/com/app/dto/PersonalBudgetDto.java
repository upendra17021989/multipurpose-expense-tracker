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
public class PersonalBudgetDto {
    private Long id;
    private Long accountId;
    private Integer month;
    private Integer year;
    private BigDecimal monthlyBudget;
    private BigDecimal monthlySavingsTarget;
    private Boolean alertEnabled;
    private LocalDateTime createdAt;
}
