package com.app.dto;

import jakarta.validation.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public final class SocietyJournalDtos {
    private SocietyJournalDtos() {}
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class Line {
        private int lineNumber; private String ledgerName; private String particulars; private Long flatId; private String flatLabel;
        private BigDecimal debit; private BigDecimal credit; @Builder.Default private List<String> errors = new ArrayList<>();
    }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class Voucher {
        private LocalDate date; private String referenceNumber; private String voucherType; private String voucherNumber; private String narration;
        private BigDecimal totalDebit; private BigDecimal totalCredit; private boolean duplicate; private boolean balanced;
        @Builder.Default private List<Line> lines = new ArrayList<>(); @Builder.Default private List<String> errors = new ArrayList<>();
    }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class Preview {
        private String fileName; private String sheetName; private String financialYear; private int totalVouchers; private int readyVouchers;
        private int duplicateVouchers; private int reviewVouchers; @Builder.Default private List<Voucher> vouchers = new ArrayList<>();
    }
    @Data @NoArgsConstructor @AllArgsConstructor public static class ImportRequest {
        @NotBlank private String financialYear; @Valid @NotEmpty private List<Voucher> vouchers;
    }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class ImportResult { private int created; private int skipped; }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor public static class PageResult {
        private List<Voucher> content; private long totalElements; private int totalPages; private int number;
    }
}
