package com.app.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="society_agency_workers") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SocietyAgencyWorker {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="account_id",nullable=false) private Account account;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="agency_id",nullable=false) private SocietyAgency agency;
 @Column(nullable=false) private String workerName; private String workerCode; private String designation; private String mobile;
 @Column(nullable=false) @Builder.Default private Boolean active=true;
 @Column(nullable=false,updatable=false) @Builder.Default private LocalDateTime createdAt=LocalDateTime.now();
 @Column(nullable=false) @Builder.Default private LocalDateTime updatedAt=LocalDateTime.now();
 @PreUpdate void updateTime(){updatedAt=LocalDateTime.now();}
}
