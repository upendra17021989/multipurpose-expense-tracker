package com.app.repository;

import com.app.entity.FestivalCouponEntitlement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface FestivalCouponEntitlementRepository extends JpaRepository<FestivalCouponEntitlement, Long> {
    Optional<FestivalCouponEntitlement> findByAccountIdAndFestivalCollectionId(Long accountId, Long collectionId);
    List<FestivalCouponEntitlement> findByAccountIdAndFestivalEventId(Long accountId, Long festivalEventId);
}
