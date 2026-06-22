package com.app.repository;

import com.app.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByAccountIdAndActiveTrue(Long accountId);
    Optional<Customer> findByAccountIdAndIdAndActiveTrue(Long accountId, Long customerId);
}
