package com.app.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal;
@Entity @Table(name="shared_expense_payers") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SharedExpensePayer { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="expense_id",nullable=false) private SharedExpense expense; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="member_id",nullable=false) private SharedGroupMember member; @Column(nullable=false,precision=19,scale=2) private BigDecimal paidAmount; }
