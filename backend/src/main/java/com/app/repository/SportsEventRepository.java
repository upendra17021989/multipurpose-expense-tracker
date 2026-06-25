package com.app.repository;

import com.app.entity.SportsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SportsEventRepository extends JpaRepository<SportsEvent, Long> {
    List<SportsEvent> findByAccountId(Long accountId);
    List<SportsEvent> findByAccountIdAndYear(Long accountId, Integer year);
    Optional<SportsEvent> findByAccountIdAndId(Long accountId, Long id);
}