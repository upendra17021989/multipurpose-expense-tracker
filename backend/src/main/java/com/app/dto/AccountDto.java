package com.app.dto;

import com.app.entity.AccountType;
import com.app.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountDto {
    private Long id;
    private Long userId;
    private AccountType accountType;
    private String accountName;
    private String address;
    private String societyName;
    private String storeName;
    private UserRole role;
    private Boolean active;
    private LocalDateTime createdAt;
}
