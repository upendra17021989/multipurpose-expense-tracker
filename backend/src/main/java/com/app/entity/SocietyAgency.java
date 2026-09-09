package com.app.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.*;
@Entity @Table(name="society_agencies") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyAgency {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="account_id",nullable=false) private Account account;
 @Column(nullable=false) private String name; @Column(nullable=false) private String serviceCategory;
 private String contactPerson; private String phone; private String email; private LocalDate contractStart; private LocalDate contractEnd;
 @Column(nullable=false) @Builder.Default private Integer requiredHeadcount=0;
 @Column(nullable=false) @Builder.Default private Boolean active=true;
 @Column(nullable=false,updatable=false) @Builder.Default private LocalDateTime createdAt=LocalDateTime.now();
 @Column(nullable=false) @Builder.Default private LocalDateTime updatedAt=LocalDateTime.now();
 @PreUpdate void updateTime(){updatedAt=LocalDateTime.now();}
}
