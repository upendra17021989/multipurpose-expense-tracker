package com.app.repository;

import com.app.entity.PersonalDocument;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PersonalDocumentRepository extends JpaRepository<PersonalDocument, Long>, JpaSpecificationExecutor<PersonalDocument> {
    Optional<PersonalDocument> findByIdAndUploadedBy(Long id, Long uploadedBy);
}
