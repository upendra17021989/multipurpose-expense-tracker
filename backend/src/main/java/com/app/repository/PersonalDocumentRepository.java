package com.app.repository;

import com.app.entity.PersonalDocument;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PersonalDocumentRepository extends JpaRepository<PersonalDocument, Long>, JpaSpecificationExecutor<PersonalDocument> {
    Optional<PersonalDocument> findByIdAndUploadedBy(Long id, Long uploadedBy);
    @Query("select coalesce(sum(d.fileSize), 0) from PersonalDocument d")
    long totalStorageBytes();
    @Query("select d.uploadedBy, count(d), coalesce(sum(d.fileSize), 0) from PersonalDocument d group by d.uploadedBy order by sum(d.fileSize) desc")
    java.util.List<Object[]> storageByOwner(org.springframework.data.domain.Pageable pageable);
    @Query("select d.account.id, d.account.accountName, count(d), coalesce(sum(d.fileSize), 0) from PersonalDocument d group by d.account.id, d.account.accountName order by sum(d.fileSize) desc")
    java.util.List<Object[]> storageByAccount(org.springframework.data.domain.Pageable pageable);
}
