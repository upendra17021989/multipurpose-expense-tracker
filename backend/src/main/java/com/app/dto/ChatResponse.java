package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ChatResponse(String answer, String mode, List<Source> sources, Summary summary) {
    public record Source(String id, String title, String url) {}
    public record CategoryTotal(String category, BigDecimal amount) {}
    public record Summary(LocalDate startDate, LocalDate endDate, BigDecimal total,
                          long count, List<CategoryTotal> categories, String scope) {}
}
