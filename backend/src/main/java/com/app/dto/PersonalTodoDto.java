package com.app.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class PersonalTodoDto {
    private Long id;
    private String title;
    private String notes;
    private LocalDate dueDate;
    private String priority;
    private Boolean completed;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
}
