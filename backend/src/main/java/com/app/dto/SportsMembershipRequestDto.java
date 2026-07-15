package com.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SportsMembershipRequestDto {
    private Long id;
    private Long userId;
    private String name;
    private String mobile;
    private String email;
}
