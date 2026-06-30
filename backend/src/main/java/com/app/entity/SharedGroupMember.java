package com.app.entity;
import jakarta.persistence.*; import lombok.*; import java.time.LocalDateTime;
@Entity @Table(name="shared_group_members") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SharedGroupMember { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="group_id",nullable=false) private SharedExpenseGroup group; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id") private User user; @Column(nullable=false,length=150) private String memberName; private String email; private String mobile; @Builder.Default @Column(nullable=false) private Boolean active=true; @Builder.Default @Column(nullable=false,updatable=false) private LocalDateTime createdAt=LocalDateTime.now(); }
