package com.app.dto;

import com.app.entity.PersonalDocumentCategory;
import lombok.*;
import java.time.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PersonalDocumentDto {
    private Long id;
    private String title;
    private PersonalDocumentCategory category;
    private String issuer;
    private String documentNumber;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private String tags;
    private String notes;
    private String originalFileName;
    private String contentType;
    private Long fileSize;
    private Long uploadedBy;
    private Boolean sharedWithMe;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
