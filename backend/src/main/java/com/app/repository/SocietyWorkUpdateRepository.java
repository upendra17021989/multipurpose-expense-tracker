package com.app.repository; import com.app.entity.SocietyWorkUpdate; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SocietyWorkUpdateRepository extends JpaRepository<SocietyWorkUpdate,Long>{List<SocietyWorkUpdate> findByAccountIdAndWorkOrderIdOrderByCreatedAtAsc(Long accountId,Long workOrderId);}
