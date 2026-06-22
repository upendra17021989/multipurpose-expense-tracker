package com.app.controller;

import com.app.dto.ProductCreateRequest;
import com.app.dto.ProductDto;
import com.app.security.UserPrincipal;
import com.app.service.ProductService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/kirana/products")
public class KiranaProductController {

    private final ProductService productService;

    public KiranaProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductDto>> getProducts(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Fetching products for account: {}", userPrincipal.getAccountId());
        return ResponseEntity.ok(productService.getProductsByAccountId(userPrincipal.getAccountId()));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<ProductDto>> getLowStockProducts(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Fetching low stock products for account: {}", userPrincipal.getAccountId());
        return ResponseEntity.ok(productService.getLowStockProducts(userPrincipal.getAccountId()));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductDto> getProduct(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long productId) {
        log.info("Fetching product {} for account: {}", productId, userPrincipal.getAccountId());
        return ResponseEntity.ok(productService.getProductById(userPrincipal.getAccountId(), productId));
    }

    @PostMapping
    public ResponseEntity<ProductDto> createProduct(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody ProductCreateRequest request) {
        log.info("Creating product for account: {}", userPrincipal.getAccountId());
        ProductDto created = productService.createProduct(userPrincipal.getAccountId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ProductDto> updateProduct(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long productId,
            @Valid @RequestBody ProductCreateRequest request) {
        log.info("Updating product {} for account: {}", productId, userPrincipal.getAccountId());
        return ResponseEntity.ok(productService.updateProduct(userPrincipal.getAccountId(), productId, request));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long productId) {
        log.info("Deleting product {} for account: {}", productId, userPrincipal.getAccountId());
        productService.deleteProduct(userPrincipal.getAccountId(), productId);
        return ResponseEntity.noContent().build();
    }
}
