package com.app.repository;

import com.app.entity.DocumentRagIndex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface DocumentRagIndexRepository extends JpaRepository<DocumentRagIndex, Long> {
    @org.springframework.data.jpa.repository.Query("select count(i) from DocumentRagIndex i "
            + "where i.documentId = :id and i.generation = :generation and i.status = :status")
    long countCurrent(@org.springframework.data.repository.query.Param("id") Long id,
                      @org.springframework.data.repository.query.Param("generation") String generation,
                      @org.springframework.data.repository.query.Param("status") String status);
    List<DocumentRagIndex> findByStatusOrderByUpdatedAtAsc(String status, Pageable pageable);
}
