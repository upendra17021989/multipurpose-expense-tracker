package com.app.repository;

import com.app.entity.SocietyJournalEntry;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SocietyJournalEntryRepository extends JpaRepository<SocietyJournalEntry, Long> {
    boolean existsByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(Long accountId, String financialYear, String voucherNumber);

    @EntityGraph(attributePaths = {"lines", "lines.flat"})
    java.util.Optional<SocietyJournalEntry> findByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(Long accountId, String financialYear, String voucherNumber);

    @EntityGraph(attributePaths = {"lines", "lines.flat"})
    @Query("select distinct j from SocietyJournalEntry j left join j.lines l left join l.flat f where j.account.id=:accountId and j.financialYear=:year " +
            "and (:search='' or lower(j.voucherNumber) like lower(concat('%',:search,'%')) or lower(coalesce(j.referenceNumber,'')) like lower(concat('%',:search,'%')) " +
            "or lower(coalesce(j.narration,'')) like lower(concat('%',:search,'%')) or lower(l.ledgerName) like lower(concat('%',:search,'%')) " +
            "or lower(coalesce(f.blockName,'')) like lower(concat('%',:search,'%')) or lower(coalesce(f.flatNumber,'')) like lower(concat('%',:search,'%'))) order by j.entryDate desc, j.id desc")
    Page<SocietyJournalEntry> search(@Param("accountId") Long accountId, @Param("year") String year, @Param("search") String search, Pageable pageable);
}
