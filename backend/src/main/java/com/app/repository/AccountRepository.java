package com.app.repository;

import com.app.entity.Account;
import com.app.entity.AccountType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    List<Account> findByUserId(Long userId);
    List<Account> findByUserIdAndActive(Long userId, Boolean active);
    Optional<Account> findByIdAndUserId(Long accountId, Long userId);
    List<Account> findByAccountType(AccountType accountType);
}
