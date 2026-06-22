package com.app.repository;

import com.app.entity.ExpenseCategory;
import com.app.entity.AccountType;
import com.app.entity.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {
    List<ExpenseCategory> findByAccountIdAndActiveTrue(Long accountId);
    List<ExpenseCategory> findByAccountIdAndCategoryTypeAndActiveTrue(Long accountId, CategoryType categoryType);
    List<ExpenseCategory> findByAccountIdAndAccountTypeAndActiveTrue(Long accountId, AccountType accountType);
}
