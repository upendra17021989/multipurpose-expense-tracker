package com.app.repository;

import com.app.entity.SportsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SportsEventRepository extends JpaRepository<SportsEvent, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"owner"})
    List<SportsEvent> findByAccountId(Long accountId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"owner"})
    List<SportsEvent> findByAccountIdAndYear(Long accountId, Integer year);
    Optional<SportsEvent> findByAccountIdAndId(Long accountId, Long id);
}
