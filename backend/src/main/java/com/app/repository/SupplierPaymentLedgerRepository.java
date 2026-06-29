package com.app.repository;

import com.app.entity.SupplierPaymentLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import com.app.entity.TransactionType;

@Repository
public interface SupplierPaymentLedgerRepository extends JpaRepository<SupplierPaymentLedger, Long> {
    List<SupplierPaymentLedger> findByAccountId(Long accountId);
    List<SupplierPaymentLedger> findByAccountIdAndSupplierId(Long accountId, Long supplierId);
    Optional<SupplierPaymentLedger> findByAccountIdAndReferenceIdAndTransactionType(Long accountId, String referenceId, TransactionType transactionType);
}
