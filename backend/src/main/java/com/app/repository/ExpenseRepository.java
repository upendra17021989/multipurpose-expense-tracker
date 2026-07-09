package com.app.repository;

import com.app.entity.Expense;
import com.app.entity.ExpenseType;
import com.app.entity.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByAccountIdAndSoftDeletedFalse(Long accountId);
    List<Expense> findByAccountIdAndExpenseDateBetweenAndSoftDeletedFalse(Long accountId, LocalDate startDate, LocalDate endDate);
    List<Expense> findByAccountIdAndExpenseTypeAndSoftDeletedFalse(Long accountId, ExpenseType expenseType);
    List<Expense> findByAccountIdAndStatusAndSoftDeletedFalse(Long accountId, ExpenseStatus status);
    List<Expense> findByAccountIdAndFestivalEventIdAndSoftDeletedFalse(Long accountId, Long festivalEventId);
    Optional<Expense> findByAccountIdAndSourceReferenceAndSoftDeletedFalse(Long accountId, String sourceReference);
    long countBySoftDeletedFalse();
    
    @Query("SELECT e FROM Expense e WHERE e.account.id = :accountId AND e.softDeleted = false AND e.expenseDate = :date")
    List<Expense> findTodaysExpenses(@Param("accountId") Long accountId, @Param("date") LocalDate date);
}
