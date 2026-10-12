package com.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "chat_help_embeddings")
@Data
@NoArgsConstructor
public class ChatEmbedding {
    @Id
    @Column(length = 64)
    private String id;
    @Column(nullable = false, length = 64)
    private String contentHash;
    @Column(nullable = false, length = 100)
    private String model;
    @Column(nullable = false, columnDefinition = "text")
    private String vectorJson;
}
