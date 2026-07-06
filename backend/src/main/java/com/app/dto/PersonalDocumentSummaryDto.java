package com.app.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PersonalDocumentSummaryDto {
    private long total;
    private long expiringSoon;
    private long expired;
}
