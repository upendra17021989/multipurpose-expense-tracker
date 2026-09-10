package com.app.repository; import com.app.entity.SocietyWorkAssignment; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SocietyWorkAssignmentRepository extends JpaRepository<SocietyWorkAssignment,Long>{List<SocietyWorkAssignment> findByAccountIdAndWorkOrderIdAndActiveTrue(Long accountId,Long workOrderId);}
