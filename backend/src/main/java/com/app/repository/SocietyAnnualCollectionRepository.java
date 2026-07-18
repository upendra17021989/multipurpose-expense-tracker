package com.app.repository;
import com.app.entity.SocietyAnnualCollection;
import com.app.entity.SocietyCollectionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
public interface SocietyAnnualCollectionRepository extends JpaRepository<SocietyAnnualCollection, Long> {
    List<SocietyAnnualCollection> findByAccountIdAndFinancialYearOrderByPaymentDateDescIdDesc(Long accountId, String financialYear);
    @Query("select c from SocietyAnnualCollection c left join c.flat f where c.account.id = :accountId and c.financialYear = :financialYear " +
            "and (:search = '' or lower(c.sourceName) like lower(concat('%', :search, '%')) " +
            "or lower(coalesce(c.referenceNumber, '')) like lower(concat('%', :search, '%')) " +
            "or lower(coalesce(c.transactionId, '')) like lower(concat('%', :search, '%')) " +
            "or lower(coalesce(c.settlementId, '')) like lower(concat('%', :search, '%')) " +
            "or lower(coalesce(c.remarks, '')) like lower(concat('%', :search, '%')) " +
            "or lower(coalesce(f.blockName, '')) like lower(concat('%', :search, '%')) " +
            "or lower(coalesce(f.flatNumber, '')) like lower(concat('%', :search, '%')))")
    Page<SocietyAnnualCollection> search(@Param("accountId") Long accountId, @Param("financialYear") String financialYear,
                                        @Param("search") String search, Pageable pageable);
    @Query("select coalesce(sum(c.amount), 0) from SocietyAnnualCollection c where c.account.id = :accountId and c.financialYear = :financialYear")
    BigDecimal sumByAccountAndYear(@Param("accountId") Long accountId, @Param("financialYear") String financialYear);
    @Query("select coalesce(sum(c.amount), 0) from SocietyAnnualCollection c where c.account.id = :accountId and c.financialYear = :financialYear and c.collectionType = :type")
    BigDecimal sumByAccountAndYearAndType(@Param("accountId") Long accountId, @Param("financialYear") String financialYear,
                                         @Param("type") SocietyCollectionType type);
    List<SocietyAnnualCollection> findByAccountIdAndFinancialYearAndFlatIdOrderByPaymentDateDescIdDesc(Long accountId, String financialYear, Long flatId);
    Optional<SocietyAnnualCollection> findByAccountIdAndId(Long accountId, Long id);
}
