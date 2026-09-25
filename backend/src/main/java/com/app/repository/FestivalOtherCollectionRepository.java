package com.app.repository;

import com.app.entity.FestivalOtherCollection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FestivalOtherCollectionRepository extends JpaRepository<FestivalOtherCollection, Long> {
    List<FestivalOtherCollection> findByAccountIdAndFestivalEventIdOrderByPaymentDateDescCreatedAtDesc(Long accountId, Long eventId);
    long countByAccountIdAndFestivalEventId(Long accountId, Long eventId);
    Optional<FestivalOtherCollection> findByAccountIdAndId(Long accountId, Long id);
}
