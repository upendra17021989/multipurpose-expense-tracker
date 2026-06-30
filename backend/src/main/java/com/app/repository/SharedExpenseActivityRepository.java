package com.app.repository; import com.app.entity.SharedExpenseActivity; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SharedExpenseActivityRepository extends JpaRepository<SharedExpenseActivity,Long>{ List<SharedExpenseActivity> findTop100ByGroupIdOrderByCreatedAtDesc(Long groupId); }
