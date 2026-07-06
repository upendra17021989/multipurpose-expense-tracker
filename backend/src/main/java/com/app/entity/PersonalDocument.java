package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "personal_documents")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PersonalDocument {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "account_id", nullable = false)
    private Account account;
    @Column(nullable = false, length = 150) private String title;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40)
    private PersonalDocumentCategory category;
    @Column(length = 150) private String issuer;
    @Column(length = 150) private String documentNumber;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    @Column(length = 500) private String tags;
    @Column(length = 1000) private String notes;
    @Column(nullable = false, length = 255) private String originalFileName;
    @Column(nullable = false, unique = true, length = 255) private String storedFileName;
    @Column(nullable = false, length = 100) private String contentType;
    @Column(nullable = false) private Long fileSize;
    @Column(nullable = false) private Long uploadedBy;
    @Builder.Default @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
    @PrePersist protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }
    @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
