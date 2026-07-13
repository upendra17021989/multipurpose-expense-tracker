package com.app.repository;
import com.app.entity.SocietyBankBookTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface SocietyBankBookTransactionRepository extends JpaRepository<SocietyBankBookTransaction, Long> {
    boolean existsByAccountIdAndSourceReferenceAndAnnualCollectionIsNotNull(Long accountId, String sourceReference);

    @Modifying
    @Query("delete from SocietyBankBookTransaction t where t.annualCollection.id = :collectionId")
    int deleteByAnnualCollectionId(@Param("collectionId") Long collectionId);

    @Modifying
    @Query("delete from SocietyBankBookTransaction t where t.account.id = :accountId and t.sourceReference = :sourceReference and t.annualCollection is null")
    int deleteOrphanBySourceReference(@Param("accountId") Long accountId, @Param("sourceReference") String sourceReference);
}
