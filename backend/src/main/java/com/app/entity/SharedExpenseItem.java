package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "shared_expense_items") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SharedExpenseItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "expense_id", nullable = false) private SharedExpense expense;
    @Column(name = "item_name", nullable = false, length = 200) private String itemName;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal amount;
    @Column(nullable = false, precision = 12, scale = 3) private BigDecimal quantity;
    @Column(name = "unit_price", precision = 19, scale = 2) private BigDecimal unitPrice;
    @Column(name = "display_order", nullable = false) private Integer displayOrder;
}
