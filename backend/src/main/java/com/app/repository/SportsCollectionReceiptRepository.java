package com.app.repository;

import com.app.entity.SportsCollectionReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SportsCollectionReceiptRepository extends JpaRepository<SportsCollectionReceipt, Long> {
    List<SportsCollectionReceipt> findBySportsCollectionId(Long sportsCollectionId);
}