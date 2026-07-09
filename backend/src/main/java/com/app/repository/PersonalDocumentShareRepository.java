package com.app.repository;

import com.app.entity.PersonalDocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PersonalDocumentShareRepository extends JpaRepository<PersonalDocumentShare, Long> {
    List<PersonalDocumentShare> findBySharedWithUserId(Long userId);
    Optional<PersonalDocumentShare> findByDocumentIdAndSharedWithUserId(Long documentId, Long userId);
    boolean existsByDocumentIdAndSharedWithUserId(Long documentId, Long userId);
    @org.springframework.data.jpa.repository.Query("select count(distinct s.document.id) from PersonalDocumentShare s")
    long countDistinctSharedDocuments();
}
