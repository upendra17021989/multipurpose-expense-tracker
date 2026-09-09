package com.app.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SocietyStaffRequest {
    @NotBlank(message = "Staff name is required") private String staffName;
    @NotBlank(message = "Designation is required") private String designation;
    private String mobile;
    @Email(message = "Enter a valid email") private String email;
    private String address;
    private LocalDate joiningDate;
    @Pattern(regexp = "DIRECT|AGENCY|CONTRACT", message = "Invalid employment type") private String employmentType;
    private String agencyName;
    @PositiveOrZero(message = "Monthly salary cannot be negative") private BigDecimal monthlySalary;
}
