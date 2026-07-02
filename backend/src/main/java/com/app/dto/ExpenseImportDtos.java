package com.app.dto;

import com.app.entity.ExpenseStatus;
import com.app.entity.PaymentMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class ExpenseImportDtos {
    private ExpenseImportDtos() {}

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Preview {
        private String fileName;
        private String sheetName;
        private int totalRows;
        private int readyRows;
        private int warningRows;
        private int skippedRows;
        private BigDecimal totalDebit;
        @Builder.Default private List<Row> rows = new ArrayList<>();
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Row {
        private int rowNumber;
        private String sourceReference;
        private LocalDate expenseDate;
        private LocalDate valueDate;
        private String description;
        private String vendorName;
        private BigDecimal amount;
        private PaymentMode paymentMode;
        private String transactionId;
        private String utr;
        private String chequeNumber;
        private String remarks;
        private Long categoryId;
        private String categoryName;
        private ExpenseStatus status;
        private boolean duplicate;
        @Builder.Default private List<String> warnings = new ArrayList<>();
        @Builder.Default private List<String> errors = new ArrayList<>();
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ConfirmRequest {
        @Valid @NotEmpty private List<Row> rows;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Result {
        private String importBatchId;
        private int created;
        private int skipped;
        private BigDecimal importedAmount;
        @Builder.Default private List<RowResult> rows = new ArrayList<>();
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RowResult {
        private int rowNumber;
        private String sourceReference;
        private Long expenseId;
        private String status;
        private String message;
    }
}
