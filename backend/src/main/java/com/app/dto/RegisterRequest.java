package com.app.dto;

import com.app.entity.AccountType;
import com.app.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {
    private String name;
    private String mobile;
    @NotBlank(message = "Email is required for registration")
    @Email(message = "Please enter a valid email address")
    private String email;
    private String password;
    private AccountType accountType;
    private String accountName;
    private String address;
    private String societyName;
    private Long societyId;
    private String blockName;
    private String flatNumber;
    private String relation;
    private Boolean createNewSociety;
    private String storeName;
    private UserRole role;
}

