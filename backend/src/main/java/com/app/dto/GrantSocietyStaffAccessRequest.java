package com.app.dto;

import lombok.Data;

@Data
public class GrantSocietyStaffAccessRequest {
    private String mobile;
    private String email;
    private String accessRole;
}
