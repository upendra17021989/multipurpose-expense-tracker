package com.app.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserFeedbackRequest {
    @Pattern(regexp = "SUGGESTION|BUG|IMPROVEMENT|OTHER", message = "Feedback type must be SUGGESTION, BUG, IMPROVEMENT, or OTHER")
    private String feedbackType;

    @Size(max = 160)
    private String title;

    @NotBlank @Size(max = 2000)
    private String message;

    @Size(max = 500)
    private String pageUrl;

    @Min(1) @Max(5)
    private Integer rating;
}
