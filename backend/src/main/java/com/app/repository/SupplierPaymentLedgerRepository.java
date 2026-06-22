package com.app.repository;

import com.app.entity.SupplierPaymentLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierPaymentLedgerRepository extends JpaRepository<SupplierPaymentLedger, Long> {
    List<SupplierPaymentLedger> findByAccountIdAndSupplierId(Long accountId, Long supplierId);
}
