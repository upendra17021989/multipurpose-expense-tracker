package com.app.dto;

import com.app.entity.ResidentType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlatCreateRequest {
    @NotNull(message = "Block name is required")
    private String blockName;

    @NotNull(message = "Flat number is required")
    private String flatNumber;

    @NotNull(message = "Owner name is required")
    private String ownerName;

    private String mobile;
    private String email;

    @NotNull(message = "Resident type is required")
    private ResidentType residentType;
}
