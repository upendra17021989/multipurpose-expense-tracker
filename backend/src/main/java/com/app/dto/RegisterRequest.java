package com.app.dto;

import com.app.entity.AccountType;
import com.app.entity.UserRole;
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
    private String email;
    private String password;
    private AccountType accountType;
    private String accountName;
    private String address;
    private String societyName;
    private String storeName;
    private UserRole role;
}
