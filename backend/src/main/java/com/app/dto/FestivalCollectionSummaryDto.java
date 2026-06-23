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
public class FestivalCollectionSummaryDto {
    private Long festivalEventId;
    private BigDecimal totalExpected;
    private BigDecimal totalCollected;
    private BigDecimal totalPending;
    private BigDecimal totalExcess;
    private BigDecimal totalRefunded;
    private long paidFlats;
    private long pendingFlats;
    private long partialFlats;
    private long excessFlats;
    private long totalFlats;
}
