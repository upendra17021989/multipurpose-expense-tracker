package com.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "personal_document_shares",
        uniqueConstraints = @UniqueConstraint(columnNames = {"document_id", "shared_with_user_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PersonalDocumentShare {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "document_id", nullable = false)
    private PersonalDocument document;
    @Column(name = "shared_with_user_id", nullable = false) private Long sharedWithUserId;
    @Column(name = "shared_by_user_id", nullable = false) private Long sharedByUserId;
    @Builder.Default @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
