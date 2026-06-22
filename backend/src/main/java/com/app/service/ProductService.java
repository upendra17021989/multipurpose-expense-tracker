package com.app.service;

import com.app.dto.ProductCreateRequest;
import com.app.dto.ProductDto;
import com.app.entity.Product;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.ProductRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductDto> getProductsByAccountId(Long accountId) {
        return productRepository.findByAccountIdAndActiveTrue(accountId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<ProductDto> getLowStockProducts(Long accountId) {
        return productRepository.findByAccountIdAndActiveTrue(accountId)
                .stream()
                .filter(product -> product.getLowStockAlertQty() != null && 
                        product.getCurrentStock().compareTo(product.getLowStockAlertQty()) <= 0)
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public ProductDto getProductById(Long accountId, Long productId) {
        Product product = productRepository.findByAccountIdAndIdAndActiveTrue(accountId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return mapToDto(product);
    }

    public ProductDto createProduct(Long accountId, ProductCreateRequest request) {
        validateProductRequest(request);

        com.app.entity.Account account = new com.app.entity.Account();
        account.setId(accountId);

        Product product = Product.builder()
                .account(account)
                .productName(request.getProductName())
                .category(request.getCategory())
                .unit(request.getUnit())
                .purchasePrice(request.getPurchasePrice())
                .sellingPrice(request.getSellingPrice())
                .openingStock(request.getOpeningStock())
                .currentStock(request.getOpeningStock())
                .lowStockAlertQty(request.getLowStockAlertQty())
                .barcode(request.getBarcode())
                .active(true)
                .build();

        Product savedProduct = productRepository.save(product);
        log.info("Product created with ID: {}", savedProduct.getId());

        return mapToDto(savedProduct);
    }

    public ProductDto updateProduct(Long accountId, Long productId, ProductCreateRequest request) {
        Product product = productRepository.findByAccountIdAndIdAndActiveTrue(accountId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        validateProductRequest(request);

        product.setProductName(request.getProductName());
        product.setCategory(request.getCategory());
        product.setUnit(request.getUnit());
        product.setPurchasePrice(request.getPurchasePrice());
        product.setSellingPrice(request.getSellingPrice());
        product.setLowStockAlertQty(request.getLowStockAlertQty());
        product.setBarcode(request.getBarcode());

        Product updated = productRepository.save(product);
        return mapToDto(updated);
    }

    public void deleteProduct(Long accountId, Long productId) {
        Product product = productRepository.findByAccountIdAndIdAndActiveTrue(accountId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        product.setActive(false);
        productRepository.save(product);
    }

    public void updateStock(Long accountId, Long productId, BigDecimal quantity) {
        Product product = productRepository.findByAccountIdAndIdAndActiveTrue(accountId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        product.setCurrentStock(product.getCurrentStock().add(quantity));
        productRepository.save(product);
    }

    private void validateProductRequest(ProductCreateRequest request) {
        if (request.getPurchasePrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Purchase price must be greater than 0");
        }

        if (request.getSellingPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Selling price must be greater than 0");
        }

        if (request.getOpeningStock().compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Opening stock cannot be negative");
        }
    }

    private ProductDto mapToDto(Product product) {
        return ProductDto.builder()
                .id(product.getId())
                .accountId(product.getAccount().getId())
                .productName(product.getProductName())
                .category(product.getCategory())
                .unit(product.getUnit())
                .purchasePrice(product.getPurchasePrice())
                .sellingPrice(product.getSellingPrice())
                .openingStock(product.getOpeningStock())
                .currentStock(product.getCurrentStock())
                .lowStockAlertQty(product.getLowStockAlertQty())
                .barcode(product.getBarcode())
                .active(product.getActive())
                .createdAt(product.getCreatedAt())
                .build();
    }
}
