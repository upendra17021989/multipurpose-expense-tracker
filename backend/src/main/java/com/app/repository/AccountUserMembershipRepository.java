package com.app.repository;

import com.app.entity.AccountUserMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountUserMembershipRepository extends JpaRepository<AccountUserMembership, Long> {
    List<AccountUserMembership> findByUserIdAndActiveTrue(Long userId);
    Optional<AccountUserMembership> findByAccountIdAndUserIdAndActiveTrue(Long accountId, Long userId);
}
