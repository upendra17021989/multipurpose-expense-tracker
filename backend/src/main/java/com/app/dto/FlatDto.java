package com.app.dto;

import com.app.entity.ResidentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlatDto {
    private Long id;
    private Long accountId;
    private String blockName;
    private String flatNumber;
    private String ownerName;
    private String mobile;
    private String email;
    private ResidentType residentType;
    private Boolean active;
    private LocalDateTime createdAt;
}
