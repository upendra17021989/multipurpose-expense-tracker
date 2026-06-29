package com.app.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyStaffDto {
    private Long id;
    private Long accountId;
    private String staffName;
    private String designation;
    private String mobile;
    private String email;
    private String address;
    private LocalDate joiningDate;
    private BigDecimal monthlySalary;
    private Boolean active;
    private LocalDateTime createdAt;
}
