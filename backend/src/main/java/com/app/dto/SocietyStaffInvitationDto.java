package com.app.dto;
import lombok.*;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyStaffInvitationDto {
    private Long id; private Long staffId; private String contact; private String status;
    private LocalDateTime expiresAt; private LocalDateTime acceptedAt; private LocalDateTime createdAt;
    private String invitationCode;
}
