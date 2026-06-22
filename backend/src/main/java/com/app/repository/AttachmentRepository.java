package com.app.repository;

import com.app.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByAccountIdAndReferenceTypeAndReferenceId(Long accountId, String referenceType, Long referenceId);
}
