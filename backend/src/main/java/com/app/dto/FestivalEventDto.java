package com.app.dto;

import com.app.entity.FestivalEventStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FestivalEventDto {
    private Long id;
    private Long accountId;
    private String festivalName;
    private Integer year;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal budgetAmount;
    private BigDecimal collectedAmount;
    private BigDecimal totalExpense;
    private BigDecimal balanceAmount;
    private FestivalEventStatus status;
    private LocalDateTime createdAt;
}
