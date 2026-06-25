package com.app.repository;

import com.app.entity.SportsCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SportsCollectionRepository extends JpaRepository<SportsCollection, Long> {
    List<SportsCollection> findByAccountIdAndSportsEventId(Long accountId, Long sportsEventId);
    Optional<SportsCollection> findByAccountIdAndId(Long accountId, Long id);
    Optional<SportsCollection> findByAccountIdAndSportsEventIdAndSportsMemberId(Long accountId, Long sportsEventId, Long sportsMemberId);
}