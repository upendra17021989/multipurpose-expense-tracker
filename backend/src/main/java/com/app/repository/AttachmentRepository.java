package com.app.repository;

import com.app.entity.Attachment;
import com.app.entity.ReferenceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByAccountIdAndReferenceTypeAndReferenceId(Long accountId, ReferenceType referenceType, Long referenceId);
}
