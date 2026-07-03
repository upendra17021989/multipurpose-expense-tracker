package com.app.repository; import com.app.entity.SharedExpenseShare; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SharedExpenseShareRepository extends JpaRepository<SharedExpenseShare,Long>{ List<SharedExpenseShare> findByExpenseGroupIdAndExpenseReversedFalse(Long groupId); List<SharedExpenseShare> findByExpenseGroupId(Long groupId); }
