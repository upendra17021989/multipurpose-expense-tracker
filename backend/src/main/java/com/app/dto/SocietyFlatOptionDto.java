package com.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SocietyFlatOptionDto {
    private Long id;
    private String blockName;
    private String flatNumber;
}
