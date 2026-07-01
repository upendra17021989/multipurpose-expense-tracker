package com.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank
    @Size(max = 255)
    private String name;

    @NotBlank
    @Size(max = 20)
    private String mobile;

    @Email
    @Size(max = 255)
    private String email;
}
