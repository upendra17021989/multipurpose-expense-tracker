package com.app.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SystemSettingsDto {
    @NotBlank @Size(max = 80) private String siteName;
    @Size(max = 254) @Email private String supportEmail;
    @Size(max = 500) private String maintenanceNotice;
}
