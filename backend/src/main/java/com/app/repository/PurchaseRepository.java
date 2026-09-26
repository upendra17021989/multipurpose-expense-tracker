package com.app.repository;

import com.app.entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"supplier"})
    List<Purchase> findByAccountId(Long accountId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"supplier"})
    List<Purchase> findByAccountIdAndPurchaseDateBetween(Long accountId, LocalDate startDate, LocalDate endDate);
    List<Purchase> findByAccountIdAndSupplierId(Long accountId, Long supplierId);
}
