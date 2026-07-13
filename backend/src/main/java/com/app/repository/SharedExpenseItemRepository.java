package com.app.repository;
import com.app.entity.SharedExpenseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SharedExpenseItemRepository extends JpaRepository<SharedExpenseItem, Long> {
    List<SharedExpenseItem> findByExpenseIdOrderByDisplayOrderAscIdAsc(Long expenseId);
    List<SharedExpenseItem> findByExpenseGroupIdOrderByExpenseExpenseDateDescExpenseIdDescDisplayOrderAscIdAsc(Long groupId);
}

