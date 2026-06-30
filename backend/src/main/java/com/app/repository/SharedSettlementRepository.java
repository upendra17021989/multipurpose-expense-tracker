package com.app.repository; import com.app.entity.SharedSettlement; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SharedSettlementRepository extends JpaRepository<SharedSettlement,Long>{ List<SharedSettlement> findByGroupIdAndReversedFalse(Long groupId); Optional<SharedSettlement> findByIdAndGroupAccountId(Long id,Long accountId); }
