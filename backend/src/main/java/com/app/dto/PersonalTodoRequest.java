package com.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;

@Data
public class PersonalTodoRequest {
    @NotBlank @Size(max = 160)
    private String title;
    @Size(max = 1000)
    private String notes;
    private LocalDate dueDate;
    @Pattern(regexp = "LOW|MEDIUM|HIGH", message = "Priority must be LOW, MEDIUM, or HIGH")
    private String priority;
}
