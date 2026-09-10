package com.app.repository; import com.app.entity.SocietyComplaintUpdate; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SocietyComplaintUpdateRepository extends JpaRepository<SocietyComplaintUpdate,Long>{List<SocietyComplaintUpdate> findByAccountIdAndComplaintIdOrderByCreatedAtAsc(Long accountId,Long complaintId);}
