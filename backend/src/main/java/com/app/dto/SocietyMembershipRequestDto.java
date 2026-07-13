package com.app.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class SocietyMembershipRequestDto {
    private Long id;
    private Long userId;
    private String name;
    private String mobile;
    private String email;
    private LocalDateTime requestedAt;
}
