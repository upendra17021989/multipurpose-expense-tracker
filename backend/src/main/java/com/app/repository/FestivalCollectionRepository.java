package com.app.repository;

import com.app.entity.FestivalCollection;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
