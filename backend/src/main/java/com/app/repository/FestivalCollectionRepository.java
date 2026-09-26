package com.app.repository;

import com.app.entity.FestivalCollection;
import com.app.dto.FestivalCollectionDto;
import com.app.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FestivalCollectionRepository extends JpaRepository<FestivalCollection, Long> {
    interface Summary {
        java.math.BigDecimal getTotalExpected();
        java.math.BigDecimal getFlatCollected();
        java.math.BigDecimal getOtherCollected();
        long getOtherCollectionsCount();
        long getExpenseCount();
        java.math.BigDecimal getPaidExpenses();
        java.math.BigDecimal getRecordedExpenses();
        java.math.BigDecimal getTotalPending();
        java.math.BigDecimal getTotalExcess();
        java.math.BigDecimal getTotalRefunded();
        long getPaidFlats();
        long getPendingFlats();
        long getPartialFlats();
        long getExcessFlats();
        long getTotalFlats();
        long getTotalBlocks();
    }

    // Each aggregate returns one row, even for an empty event. Combining those rows
    // avoids multiplying amounts by joining the underlying one-to-many records.
    @Query(value = """
            SELECT c.totalExpected, c.flatCollected, c.totalPending, c.totalExcess, c.totalRefunded,
                   c.paidFlats, c.pendingFlats, c.partialFlats, c.excessFlats, c.totalFlats, c.totalBlocks,
                   o.otherCollected, o.otherCollectionsCount,
                   e.expenseCount, e.paidExpenses, e.recordedExpenses
            FROM (
                SELECT COALESCE(SUM(c.expected_amount), 0) AS totalExpected,
                       COALESCE(SUM(c.collected_amount), 0) AS flatCollected,
                       COALESCE(SUM(c.pending_amount), 0) AS totalPending,
                       COALESCE(SUM(c.excess_amount), 0) AS totalExcess,
                       COALESCE(SUM(c.refunded_amount), 0) AS totalRefunded,
                       COUNT(CASE WHEN c.payment_status = 'PAID' THEN 1 END) AS paidFlats,
                       COUNT(CASE WHEN c.payment_status = 'PENDING' THEN 1 END) AS pendingFlats,
                       COUNT(CASE WHEN c.payment_status = 'PARTIAL' THEN 1 END) AS partialFlats,
                       COUNT(CASE WHEN c.payment_status = 'EXCESS' THEN 1 END) AS excessFlats,
                       COUNT(c.id) AS totalFlats, COUNT(DISTINCT f.block_name) AS totalBlocks
                FROM festival_collections c LEFT JOIN flats f ON f.id = c.flat_id
                WHERE c.account_id = :accountId AND c.festival_event_id = :festivalEventId
            ) c
            CROSS JOIN (
                SELECT COUNT(*) AS otherCollectionsCount,
                       COALESCE(SUM(CASE WHEN contribution_kind = 'MONETARY' THEN amount ELSE 0 END), 0) AS otherCollected
                FROM festival_other_collections
                WHERE account_id = :accountId AND festival_event_id = :festivalEventId
            ) o
            CROSS JOIN (
                SELECT COUNT(*) AS expenseCount,
                       COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS paidExpenses,
                       COALESCE(SUM(amount), 0) AS recordedExpenses
                FROM expenses
                WHERE account_id = :accountId AND festival_event_id = :festivalEventId AND soft_deleted = false
            ) e
            """, nativeQuery = true)
    Summary summarize(@Param("accountId") Long accountId, @Param("festivalEventId") Long festivalEventId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"flat", "festivalEvent"})
    List<FestivalCollection> findByAccountIdAndFestivalEventId(Long accountId, Long festivalEventId);
    Optional<FestivalCollection> findByAccountIdAndIdAndFestivalEventId(Long accountId, Long collectionId, Long festivalEventId);
    Optional<FestivalCollection> findByAccountIdAndId(Long accountId, Long collectionId);
    Optional<FestivalCollection> findByAccountIdAndFestivalEventIdAndFlatId(Long accountId, Long festivalEventId, Long flatId);
    List<FestivalCollection> findByAccountIdAndFlatId(Long accountId, Long flatId);

    @Query("SELECT new com.app.dto.FestivalCollectionDto(c.id, c.account.id, e.id, e.festivalName, " +
            "f.id, f.blockName, f.flatNumber, f.ownerName, c.expectedAmount, c.collectedAmount, " +
            "c.pendingAmount, c.excessAmount, c.refundedAmount, c.paymentStatus, c.remarks, c.createdAt, c.updatedAt) " +
            "FROM FestivalCollection c JOIN c.flat f JOIN c.festivalEvent e WHERE c.account.id = :accountId " +
            "AND c.festivalEvent.id = :festivalEventId " +
            "AND (:blockName = '' OR LOWER(f.blockName) = LOWER(:blockName)) " +
            "AND (:status IS NULL OR c.paymentStatus = :status) " +
            "AND (:search = '' OR LOWER(CONCAT(COALESCE(f.blockName, ''), ' ', COALESCE(f.flatNumber, ''), ' ', COALESCE(f.ownerName, ''))) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "ORDER BY f.blockName, f.flatNumber, c.id")
    Page<FestivalCollectionDto> searchPage(@Param("accountId") Long accountId,
            @Param("festivalEventId") Long festivalEventId, @Param("blockName") String blockName,
            @Param("status") PaymentStatus status, @Param("search") String search, Pageable pageable);
}
