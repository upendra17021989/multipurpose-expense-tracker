package com.app.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import com.app.entity.UserRole;

@Data
@Builder
public class SocietyMembershipRequestDto {
    private Long id;
    private Long userId;
    private String name;
    private String mobile;
    private String email;
    private LocalDateTime requestedAt;
    private UserRole role;
}
