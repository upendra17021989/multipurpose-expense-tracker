package com.app.repository;
import com.app.entity.SocietyBankBookTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
public interface SocietyBankBookTransactionRepository extends JpaRepository<SocietyBankBookTransaction, Long> {
    boolean existsByAccountIdAndSourceReferenceAndAnnualCollectionIsNotNull(Long accountId, String sourceReference);
    boolean existsByAccountIdAndTransactionDateAndFlatIdAndDebitAndAnnualCollectionIsNotNull(Long accountId, LocalDate transactionDate, Long flatId, BigDecimal debit);
    List<SocietyBankBookTransaction> findByAnnualCollectionIdIn(Collection<Long> collectionIds);

    @Modifying
    @Query("delete from SocietyBankBookTransaction t where t.annualCollection.id = :collectionId")
    int deleteByAnnualCollectionId(@Param("collectionId") Long collectionId);

    @Modifying
    @Query("delete from SocietyBankBookTransaction t where t.account.id = :accountId and t.sourceReference = :sourceReference and t.annualCollection is null")
    int deleteOrphanBySourceReference(@Param("accountId") Long accountId, @Param("sourceReference") String sourceReference);
}
