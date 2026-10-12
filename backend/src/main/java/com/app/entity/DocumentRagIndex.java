package com.app.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity @Table(name = "personal_document_rag") @Data
public class DocumentRagIndex {
    @Id private Long documentId;
    @Column(nullable = false, length = 36) private String generation;
    @Column(nullable = false, length = 20) private String status;
    @Column(length = 64) private String contentHash;
    @Column(length = 100) private String embeddingModel;
    @lombok.ToString.Exclude @Column(columnDefinition = "TEXT") private String chunksJson;
    @Column(length = 200) private String error;
    @Column(nullable = false) private LocalDateTime updatedAt;
}
