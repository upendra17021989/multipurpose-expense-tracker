package com.app.dto;

import com.app.entity.AccountType;
import com.app.entity.CategoryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCategoryDto {
    private Long id;
    private Long accountId;
    private String categoryName;
    private AccountType accountType;
    private CategoryType categoryType;
    private Boolean active;
    private LocalDateTime createdAt;
}
