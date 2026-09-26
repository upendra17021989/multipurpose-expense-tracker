package com.app.repository;
import com.app.entity.ExpenseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ExpenseItemRepository extends JpaRepository<ExpenseItem, Long> {
    List<ExpenseItem> findByExpenseIdOrderByDisplayOrderAscIdAsc(Long expenseId);
    List<ExpenseItem> findByExpenseIdInOrderByDisplayOrderAscIdAsc(List<Long> expenseIds);
    void deleteByExpenseId(Long expenseId);
}
