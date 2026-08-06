package com.app.repository;

import com.app.entity.SocietyJournalLine;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SocietyJournalLineRepository extends JpaRepository<SocietyJournalLine, Long> {
    @Query("select l from SocietyJournalLine l join fetch l.journalEntry j left join fetch l.flat f " +
            "where j.account.id=:accountId and j.financialYear=:year and j.status='POSTED' and (:flatId is null or f.id=:flatId) " +
            "order by j.entryDate asc, j.id asc, l.lineNumber asc")
    List<SocietyJournalLine> ledgerLines(@Param("accountId") Long accountId, @Param("year") String year, @Param("flatId") Long flatId);

    @Query("select l from SocietyJournalLine l join fetch l.journalEntry j " +
            "where j.account.id=:accountId and j.financialYear=:year and j.status='POSTED' and l.flat is null " +
            "order by j.entryDate asc, j.id asc, l.lineNumber asc")
    List<SocietyJournalLine> unassignedLedgerLines(@Param("accountId") Long accountId, @Param("year") String year);
}
