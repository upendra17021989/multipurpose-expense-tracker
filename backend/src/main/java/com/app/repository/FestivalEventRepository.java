package com.app.repository;

import com.app.entity.FestivalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FestivalEventRepository extends JpaRepository<FestivalEvent, Long> {
    List<FestivalEvent> findByAccountId(Long accountId);
    Optional<FestivalEvent> findByAccountIdAndId(Long accountId, Long festivalEventId);
    List<FestivalEvent> findByAccountIdAndYear(Long accountId, Integer year);
}
