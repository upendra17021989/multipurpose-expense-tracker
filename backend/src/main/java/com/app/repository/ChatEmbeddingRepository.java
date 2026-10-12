package com.app.repository;

import com.app.entity.ChatEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatEmbeddingRepository extends JpaRepository<ChatEmbedding, String> {}
