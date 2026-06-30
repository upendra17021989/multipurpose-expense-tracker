package com.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Mobile number is required")
    private String mobile;
    @NotBlank(message = "Registered email is required") @Email(message = "Enter a valid email address")
    private String email;
    @NotBlank(message = "New password is required") @Size(min = 6, message = "New password must be at least 6 characters")
    private String newPassword;
    @NotBlank(message = "Confirm password is required") private String confirmPassword;
}
