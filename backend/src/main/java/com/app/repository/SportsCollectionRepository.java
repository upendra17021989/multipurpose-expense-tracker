package com.app.repository;

import com.app.entity.SportsCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SportsCollectionRepository extends JpaRepository<SportsCollection, Long> {
    List<SportsCollection> findByAccountIdAndSportsEventId(Long accountId, Long sportsEventId);
    Optional<SportsCollection> findByAccountIdAndId(Long accountId, Long id);
    Optional<SportsCollection> findByAccountIdAndSportsEventIdAndSportsMemberId(Long accountId, Long sportsEventId, Long sportsMemberId);

    @Query("select c from SportsCollection c where c.account.id = :accountId and c.sportsMember.id = :memberId " +
            "and (c.sportsEvent.startDate < :startDate or (c.sportsEvent.startDate = :startDate and c.sportsEvent.id < :eventId)) " +
            "order by c.sportsEvent.startDate desc, c.sportsEvent.id desc")
    List<SportsCollection> findPriorCollections(@Param("accountId") Long accountId, @Param("memberId") Long memberId,
                                                @Param("startDate") java.time.LocalDate startDate, @Param("eventId") Long eventId);
}
