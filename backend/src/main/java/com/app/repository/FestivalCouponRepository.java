package com.app.repository;

import com.app.entity.FestivalCoupon;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface FestivalCouponRepository extends JpaRepository<FestivalCoupon, Long> {
    List<FestivalCoupon> findByAccountIdAndFestivalEventIdOrderByFlatBlockNameAscFlatFlatNumberAscSequenceNumberAsc(Long accountId, Long festivalEventId);
    List<FestivalCoupon> findByAccountIdAndFestivalCollectionIdOrderBySequenceNumberAsc(Long accountId, Long collectionId);
    Optional<FestivalCoupon> findByAccountIdAndId(Long accountId, Long id);
    boolean existsByFestivalEventIdAndFlatIdAndSequenceNumber(Long festivalEventId, Long flatId, Integer sequenceNumber);
}
