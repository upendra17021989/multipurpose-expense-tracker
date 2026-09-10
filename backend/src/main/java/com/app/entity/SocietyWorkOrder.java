package com.app.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.LocalDateTime;
@Entity @Table(name="society_work_orders") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyWorkOrder {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="account_id",nullable=false) private Account account;
 @Column(nullable=false,length=30) private String workOrderNumber; @Column(nullable=false,length=180) private String title;
 @Column(length=2000) private String description; @Column(nullable=false,length=30) private String category; @Column(nullable=false,length=30) private String source;
 private String location; @Column(nullable=false,length=20) private String priority; @Column(nullable=false,length=20) @Builder.Default private String status="OPEN";
 private LocalDateTime plannedStart; private LocalDateTime dueAt; private LocalDateTime actualStart; private LocalDateTime completedAt;
 @Column(length=2000) private String completionNotes; @Column(precision=12,scale=2) private BigDecimal estimatedCost; @Column(precision=12,scale=2) private BigDecimal actualCost;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="verified_by_user_id") private User verifiedBy; private LocalDateTime verifiedAt;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="created_by_user_id",nullable=false) private User createdBy;
 @Column(nullable=false,updatable=false) @Builder.Default private LocalDateTime createdAt=LocalDateTime.now(); @Column(nullable=false) @Builder.Default private LocalDateTime updatedAt=LocalDateTime.now();
 @PreUpdate void touch(){updatedAt=LocalDateTime.now();}
}
