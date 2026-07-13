package com.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApproveSocietyMembershipRequest {
    @NotNull(message = "Flat is required")
    private Long flatId;
    @NotBlank(message = "Flat relation is required")
    private String relation;
}
