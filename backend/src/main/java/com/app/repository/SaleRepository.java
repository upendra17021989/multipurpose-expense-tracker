package com.app.repository;

import com.app.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    List<Sale> findByAccountId(Long accountId);
    List<Sale> findByAccountIdAndSaleDateBetween(Long accountId, LocalDate startDate, LocalDate endDate);
    List<Sale> findByAccountIdAndCustomerId(Long accountId, Long customerId);
    
    @Query("SELECT s FROM Sale s WHERE s.account.id = :accountId AND s.saleDate = :date")
    List<Sale> findTodaysSales(@Param("accountId") Long accountId, @Param("date") LocalDate date);
}
