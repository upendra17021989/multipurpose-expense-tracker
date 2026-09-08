package com.app.repository;

import com.app.entity.FestivalCollection;
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
    List<FestivalCollection> findByAccountIdAndFestivalEventId(Long accountId, Long festivalEventId);
    Optional<FestivalCollection> findByAccountIdAndIdAndFestivalEventId(Long accountId, Long collectionId, Long festivalEventId);
    Optional<FestivalCollection> findByAccountIdAndId(Long accountId, Long collectionId);
    Optional<FestivalCollection> findByAccountIdAndFestivalEventIdAndFlatId(Long accountId, Long festivalEventId, Long flatId);
    List<FestivalCollection> findByAccountIdAndFlatId(Long accountId, Long flatId);

    @Query("SELECT c FROM FestivalCollection c JOIN c.flat f WHERE c.account.id = :accountId " +
            "AND c.festivalEvent.id = :festivalEventId " +
            "AND (:blockName = '' OR LOWER(f.blockName) = LOWER(:blockName)) " +
            "AND (:status IS NULL OR c.paymentStatus = :status) " +
            "AND (:search = '' OR LOWER(CONCAT(COALESCE(f.blockName, ''), ' ', COALESCE(f.flatNumber, ''), ' ', COALESCE(f.ownerName, ''))) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "ORDER BY f.blockName, f.flatNumber")
    Page<FestivalCollection> searchPage(@Param("accountId") Long accountId,
            @Param("festivalEventId") Long festivalEventId, @Param("blockName") String blockName,
            @Param("status") PaymentStatus status, @Param("search") String search, Pageable pageable);
}
