package com.app.repository; import com.app.entity.SharedExpensePayer; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SharedExpensePayerRepository extends JpaRepository<SharedExpensePayer,Long>{ List<SharedExpensePayer> findByExpenseGroupIdAndExpenseReversedFalse(Long groupId); }
