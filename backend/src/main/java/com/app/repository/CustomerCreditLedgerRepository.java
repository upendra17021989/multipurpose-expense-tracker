package com.app.repository;

import com.app.entity.CustomerCreditLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerCreditLedgerRepository extends JpaRepository<CustomerCreditLedger, Long> {
    List<CustomerCreditLedger> findByAccountId(Long accountId);
    List<CustomerCreditLedger> findByAccountIdAndCustomerId(Long accountId, Long customerId);
}
