package com.app.dto;

import com.app.entity.StaffAccessStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateSocietyStaffAccessStatusRequest {
    @NotNull(message = "Access status is required")
    private StaffAccessStatus status;
}
