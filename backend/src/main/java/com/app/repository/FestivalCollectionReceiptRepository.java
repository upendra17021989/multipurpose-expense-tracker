package com.app.repository;

import com.app.entity.FestivalCollectionReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FestivalCollectionReceiptRepository extends JpaRepository<FestivalCollectionReceipt, Long> {
    List<FestivalCollectionReceipt> findByFestivalCollectionId(Long festivalCollectionId);
}
