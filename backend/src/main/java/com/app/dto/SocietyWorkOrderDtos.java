package com.app.dto;
import jakarta.validation.constraints.*; import lombok.*; import java.math.BigDecimal; import java.time.LocalDateTime; import java.util.List;
public final class SocietyWorkOrderDtos {private SocietyWorkOrderDtos(){}
 @Data public static class CreateRequest{@NotBlank @Size(max=180) private String title;@Size(max=2000) private String description;@NotBlank private String category;@NotBlank private String source;private String location;@NotBlank private String priority;private LocalDateTime plannedStart;private LocalDateTime dueAt;@PositiveOrZero private BigDecimal estimatedCost;}
 @Data public static class AssignmentRequest{private Long staffId;private Long agencyId;private Long vendorId;}
 @Data public static class UpdateRequest{@NotBlank @Size(max=2000) private String notes;private String status;}
 @Data public static class CompleteRequest{@NotBlank @Size(max=2000) private String completionNotes;@PositiveOrZero private BigDecimal actualCost;}
 @Data public static class VerifyRequest{@Size(max=2000) private String notes;}
 @Data @Builder public static class AssignmentDto{private Long id;private String assigneeType;private Long assigneeId;private String assigneeName;private LocalDateTime assignedAt;}
 @Data @Builder public static class UpdateDto{private Long id;private String updateType;private String previousStatus;private String newStatus;private String notes;private String createdBy;private LocalDateTime createdAt;}
 @Data @Builder public static class WorkOrderDto{private Long id;private String workOrderNumber;private String title;private String description;private String category;private String source;private String location;private String priority;private String status;private LocalDateTime plannedStart;private LocalDateTime dueAt;private LocalDateTime actualStart;private LocalDateTime completedAt;private String completionNotes;private BigDecimal estimatedCost;private BigDecimal actualCost;private String verifiedBy;private LocalDateTime verifiedAt;private String createdBy;private LocalDateTime createdAt;private boolean overdue;private List<AssignmentDto> assignments;private List<UpdateDto> updates;}
}
