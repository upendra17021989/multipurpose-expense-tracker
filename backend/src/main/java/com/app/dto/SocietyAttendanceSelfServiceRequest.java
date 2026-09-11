package com.app.dto;import jakarta.validation.constraints.*;import lombok.Data;
@Data public class SocietyAttendanceSelfServiceRequest {@NotBlank @Pattern(regexp="CHECK_IN|CHECK_OUT") private String action;}
