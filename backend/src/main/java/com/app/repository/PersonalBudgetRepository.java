package com.app.repository;

import com.app.entity.PersonalBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PersonalBudgetRepository extends JpaRepository<PersonalBudget, Long> {
    List<PersonalBudget> findByAccountId(Long accountId);
    Optional<PersonalBudget> findByAccountIdAndMonthAndYear(Long accountId, Integer month, Integer year);
}
