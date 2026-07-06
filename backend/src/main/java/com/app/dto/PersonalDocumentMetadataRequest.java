package com.app.dto;

import com.app.entity.PersonalDocumentCategory;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor
public class PersonalDocumentMetadataRequest {
    @NotBlank @Size(max = 150) private String title;
    @NotNull private PersonalDocumentCategory category;
    @Size(max = 150) private String issuer;
    @Size(max = 150) private String documentNumber;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    @Size(max = 500) private String tags;
    @Size(max = 1000) private String notes;
}
