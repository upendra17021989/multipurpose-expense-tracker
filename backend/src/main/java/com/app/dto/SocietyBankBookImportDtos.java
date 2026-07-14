package com.app.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import com.app.entity.PaymentMode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public final class SocietyBankBookImportDtos {
    private SocietyBankBookImportDtos() {}
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class Preview {
        private String fileName; private String sheetName; private String financialYear;
        private int totalRows; private int readyRows; private int duplicateRows; private int unmatchedRows; private int skippedRows;
        private BigDecimal totalAmount; @Builder.Default private List<Row> rows = new ArrayList<>();
    }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class Row {
        private int rowNumber; private LocalDate date; private String type; private String flatText; private Long flatId; private String flatLabel;
        private String particulars; private String sourceName; private String transactionId; private String referenceNumber;
        private String voucherNumber; private String settlementId; private BigDecimal debit; private BigDecimal credit; private BigDecimal balance;
        private PaymentMode paymentMode;
        private String sourceReference; private boolean duplicate; @Builder.Default private List<String> warnings = new ArrayList<>();
        @Builder.Default private List<String> errors = new ArrayList<>();
    }
    @Data @NoArgsConstructor @AllArgsConstructor public static class ConfirmRequest {
        @NotBlank private String fileName; @NotBlank private String financialYear; @Valid @NotEmpty private List<Row> rows;
    }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class Result {
        private String batchId; private int created; private int skipped; private BigDecimal importedAmount;
    }
}
