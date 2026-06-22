package com.app.repository;

import com.app.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByAccountIdAndActiveTrue(Long accountId);
    Optional<Product> findByAccountIdAndIdAndActiveTrue(Long accountId, Long productId);
    Optional<Product> findByAccountIdAndBarcode(Long accountId, String barcode);
}
