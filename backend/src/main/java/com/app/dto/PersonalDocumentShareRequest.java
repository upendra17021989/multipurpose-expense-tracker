package com.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PersonalDocumentShareRequest {
    @NotBlank private String recipient;
}
