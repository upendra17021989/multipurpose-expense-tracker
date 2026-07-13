package com.app.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class JoinSocietyRequest {
    @NotNull(message = "Society is required")
    private Long societyId;
}
