package com.app.dto;

import com.app.entity.ResidentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

public class FlatImportDtos {
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Row {
        private Integer rowNumber;
        private String blockName;
        private String flatNumber;
        private String ownerName;
        private String mobile;
        private String email;
        private ResidentType residentType;
        private boolean duplicate;
        @Builder.Default
        private List<String> warnings = new ArrayList<>();
        @Builder.Default
        private List<String> errors = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Preview {
        private String fileName;
        private int totalRows;
        private int readyRows;
        private int warningRows;
        private int duplicateRows;
        private List<Row> rows;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfirmRequest {
        private List<Row> rows;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RowResult {
        private Integer rowNumber;
        private Long flatId;
        private String status;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Result {
        private int created;
        private int skipped;
        private List<RowResult> rows;
    }
}
