package com.app.dto;

import com.app.entity.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateSocietyMemberRoleRequest {
    @NotNull(message = "Role is required")
    private UserRole role;
}
