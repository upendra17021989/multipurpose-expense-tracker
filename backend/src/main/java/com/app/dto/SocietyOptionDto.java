package com.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SocietyOptionDto {
    private Long id;
    private String name;
    private String address;
}
