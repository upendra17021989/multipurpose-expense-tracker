package com.app.repository;

import com.app.entity.CustomerCreditLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import com.app.entity.TransactionType;

@Repository
public interface CustomerCreditLedgerRepository extends JpaRepository<CustomerCreditLedger, Long> {
    List<CustomerCreditLedger> findByAccountId(Long accountId);
    List<CustomerCreditLedger> findByAccountIdAndCustomerId(Long accountId, Long customerId);
    Optional<CustomerCreditLedger> findByAccountIdAndReferenceIdAndTransactionType(Long accountId, String referenceId, TransactionType transactionType);
}
