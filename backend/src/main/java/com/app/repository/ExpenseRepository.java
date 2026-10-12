package com.app.repository;

import com.app.entity.Expense;
import com.app.entity.ExpenseType;
import com.app.entity.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    interface ChatCategoryTotal {
        String getCategory();
        java.math.BigDecimal getAmount();
        Long getEntryCount();
    }

    @Query("SELECT e.category.categoryName AS category, SUM(e.amount) AS amount, COUNT(e) AS entryCount " +
            "FROM Expense e WHERE e.account.id = :accountId AND e.softDeleted = false " +
            "AND e.accountType = com.app.entity.AccountType.INDIVIDUAL " +
            "AND e.status <> com.app.entity.ExpenseStatus.REJECTED " +
            "AND e.expenseDate BETWEEN :startDate AND :endDate " +
            "GROUP BY e.category.categoryName ORDER BY SUM(e.amount) DESC")
    List<ChatCategoryTotal> summarizeForChat(@Param("accountId") Long accountId,
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"category"})
    List<Expense> findByAccountIdAndSoftDeletedFalse(Long accountId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"category"})
    List<Expense> findByAccountIdAndExpenseDateBetweenAndSoftDeletedFalse(Long accountId, LocalDate startDate, LocalDate endDate);
    List<Expense> findByAccountIdAndExpenseTypeAndSoftDeletedFalse(Long accountId, ExpenseType expenseType);
    List<Expense> findByAccountIdAndStatusAndSoftDeletedFalse(Long accountId, ExpenseStatus status);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"category"})
    List<Expense> findByAccountIdAndFestivalEventIdAndSoftDeletedFalse(Long accountId, Long festivalEventId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"category"})
    @Query("SELECT e FROM Expense e LEFT JOIN e.category c WHERE e.account.id = :accountId " +
            "AND e.festivalEvent.id = :festivalEventId AND e.expenseType = :expenseType AND e.softDeleted = false " +
            "AND (:search = '' OR LOWER(COALESCE(e.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(COALESCE(e.vendorName, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(COALESCE(c.categoryName, '')) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Expense> searchFestivalExpenses(@Param("accountId") Long accountId,
            @Param("festivalEventId") Long festivalEventId, @Param("expenseType") ExpenseType expenseType,
            @Param("search") String search, Pageable pageable);
    Optional<Expense> findByAccountIdAndSourceReferenceAndSoftDeletedFalse(Long accountId, String sourceReference);
    List<Expense> findByAccountIdAndWorkOrderIdAndSoftDeletedFalseOrderByCreatedAtDesc(Long accountId, Long workOrderId);
    long countBySoftDeletedFalse();
    
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"category"})
    @Query("SELECT e FROM Expense e WHERE e.account.id = :accountId AND e.softDeleted = false AND e.expenseDate = :date")
    List<Expense> findTodaysExpenses(@Param("accountId") Long accountId, @Param("date") LocalDate date);
}
