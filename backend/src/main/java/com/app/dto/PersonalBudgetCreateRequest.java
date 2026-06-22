package com.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalBudgetCreateRequest {
    private Integer month;
    private Integer year;
    private BigDecimal monthlyBudget;
    private BigDecimal monthlySavingsTarget;
}
