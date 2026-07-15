package com.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserFeedbackStatusRequest {
    @NotBlank
    @Pattern(regexp = "NEW|REVIEWED|PLANNED|CLOSED", message = "Status must be NEW, REVIEWED, PLANNED, or CLOSED")
    private String status;

    @Size(max = 1000)
    private String adminRemarks;
}
