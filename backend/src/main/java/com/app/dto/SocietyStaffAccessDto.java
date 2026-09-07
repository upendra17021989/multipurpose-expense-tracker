package com.app.dto;

import com.app.entity.StaffAccessStatus;
import com.app.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocietyStaffAccessDto {
    private Long id;
    private Long accountId;
    private Long staffId;
    private Long userId;
    private String userName;
    private String mobile;
    private String email;
    private UserRole role;
    private StaffAccessStatus status;
    private Long grantedByUserId;
    private LocalDateTime activatedAt;
    private LocalDateTime suspendedAt;
    private LocalDateTime revokedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
