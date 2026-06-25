package com.app.repository;

import com.app.entity.SportsExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SportsExpenseRepository extends JpaRepository<SportsExpense, Long> {
    List<SportsExpense> findByAccountIdAndSoftDeletedFalse(Long accountId);
    List<SportsExpense> findByAccountIdAndSportsEventIdAndSoftDeletedFalse(Long accountId, Long sportsEventId);
    List<SportsExpense> findByAccountIdAndExpenseDateBetweenAndSoftDeletedFalse(Long accountId, LocalDate startDate, LocalDate endDate);
    Optional<SportsExpense> findByAccountIdAndIdAndSoftDeletedFalse(Long accountId, Long id);
}