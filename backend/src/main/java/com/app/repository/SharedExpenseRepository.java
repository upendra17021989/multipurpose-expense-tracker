package com.app.repository; import com.app.entity.SharedExpense; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SharedExpenseRepository extends JpaRepository<SharedExpense,Long>{ List<SharedExpense> findByGroupIdOrderByExpenseDateDescIdDesc(Long groupId); Optional<SharedExpense> findByIdAndGroupAccountId(Long id,Long accountId); }
