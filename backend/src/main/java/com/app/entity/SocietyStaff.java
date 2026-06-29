package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "society_staff")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocietyStaff {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false)
    private Account account;
    @Column(nullable = false) private String staffName;
    @Column(nullable = false) private String designation;
    private String mobile;
    private String email;
    private String address;
    private LocalDate joiningDate;
    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default private BigDecimal monthlySalary = BigDecimal.ZERO;
    @Column(nullable = false) @Builder.Default private Boolean active = true;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    @Column(nullable = false) @Builder.Default private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (monthlySalary == null) monthlySalary = BigDecimal.ZERO;
        if (active == null) active = true;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}
