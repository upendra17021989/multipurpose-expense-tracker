package com.app.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class UserFeedbackDto {
    private Long id;
    private String feedbackType;
    private String title;
    private String message;
    private String pageUrl;
    private Integer rating;
    private String status;
    private String adminRemarks;
    private String accountName;
    private String userName;
    private String userMobile;
    private String userEmail;
    private String accountType;
    private LocalDateTime createdAt;
}


