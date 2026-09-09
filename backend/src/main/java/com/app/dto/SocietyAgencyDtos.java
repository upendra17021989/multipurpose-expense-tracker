package com.app.dto;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
public final class SocietyAgencyDtos {
 private SocietyAgencyDtos(){}
 @Data public static class AgencyRequest { @NotBlank private String name; @NotBlank private String serviceCategory; private String contactPerson; private String phone; @Email private String email; private LocalDate contractStart; private LocalDate contractEnd; @PositiveOrZero private Integer requiredHeadcount; }
 @Data @Builder public static class AgencyDto { private Long id; private String name; private String serviceCategory; private String contactPerson; private String phone; private String email; private LocalDate contractStart; private LocalDate contractEnd; private Integer requiredHeadcount; private java.util.List<WorkerDto> workers; }
 @Data public static class WorkerRequest { @NotBlank private String workerName; private String workerCode; private String designation; private String mobile; }
 @Data @Builder public static class WorkerDto { private Long id; private Long agencyId; private String workerName; private String workerCode; private String designation; private String mobile; }
}
