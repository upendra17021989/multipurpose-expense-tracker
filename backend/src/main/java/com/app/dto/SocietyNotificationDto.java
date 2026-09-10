package com.app.dto; import lombok.*; import java.time.LocalDateTime;
@Data @Builder public class SocietyNotificationDto {private Long id;private String notificationType;private String entityType;private Long entityId;private String title;private String message;private String priority;private LocalDateTime readAt;private LocalDateTime createdAt;}
