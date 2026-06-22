package com.app.repository;

import com.app.entity.Flat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlatRepository extends JpaRepository<Flat, Long> {
    List<Flat> findByAccountIdAndActiveTrue(Long accountId);
    Optional<Flat> findByAccountIdAndIdAndActiveTrue(Long accountId, Long flatId);
    List<Flat> findByAccountIdAndBlockNameAndActiveTrue(Long accountId, String blockName);
}
