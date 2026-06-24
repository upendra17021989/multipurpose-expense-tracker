package com.app.service;

import com.app.dto.PurchaseCreateRequest;
import com.app.dto.PurchaseDto;
import com.app.dto.PurchaseItemDto;
import com.app.dto.PurchaseItemRequest;
import com.app.entity.Account;
import com.app.entity.PaymentMode;
import com.app.entity.Product;
import com.app.entity.Purchase;
import com.app.entity.PurchaseItem;
import com.app.entity.Supplier;
import com.app.entity.SupplierPaymentLedger;
import com.app.entity.TransactionType;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.ProductRepository;
import com.app.repository.PurchaseItemRepository;
import com.app.repository.PurchaseRepository;
import com.app.repository.SupplierPaymentLedgerRepository;
import com.app.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class PurchaseService {
    private final PurchaseRepository purchaseRepository;
    private final PurchaseItemRepository purchaseItemRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierPaymentLedgerRepository supplierPaymentLedgerRepository;

    public PurchaseService(
            PurchaseRepository purchaseRepository,
            PurchaseItemRepository purchaseItemRepository,
            ProductRepository productRepository,
            SupplierRepository supplierRepository,
            SupplierPaymentLedgerRepository supplierPaymentLedgerRepository) {
        this.purchaseRepository = purchaseRepository;
        this.purchaseItemRepository = purchaseItemRepository;
        this.productRepository = productRepository;
        this.supplierRepository = supplierRepository;
        this.supplierPaymentLedgerRepository = supplierPaymentLedgerRepository;
    }

    @Transactional(readOnly = true)
    public List<PurchaseDto> getPurchases(Long accountId) {
        return purchaseRepository.findByAccountId(accountId).stream().map(this::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PurchaseDto> getPurchasesByDateRange(Long accountId, LocalDate startDate, LocalDate endDate) {
        return purchaseRepository.findByAccountIdAndPurchaseDateBetween(accountId, startDate, endDate).stream().map(this::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public PurchaseDto getPurchase(Long accountId, Long purchaseId) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .filter(item -> item.getAccount().getId().equals(accountId))
                .orElseThrow(() -> new ResourceNotFoundException("Purchase not found"));
        return mapToDto(purchase);
    }

    @Transactional
    public PurchaseDto createPurchase(Long accountId, PurchaseCreateRequest request) {
        Account account = new Account();
        account.setId(accountId);
        Supplier supplier = supplierRepository.findByAccountIdAndIdAndActiveTrue(accountId, request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

        BigDecimal totalAmount = request.getItems().stream()
                .map(item -> item.getQuantity().multiply(item.getPurchasePrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discount = nonNull(request.getDiscount());
        BigDecimal netAmount = totalAmount.subtract(discount);
        if (netAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Discount cannot be greater than total amount");
        }

        BigDecimal amountPaid = request.getAmountPaid() != null ? request.getAmountPaid() : defaultAmountPaid(request.getPaymentMode(), netAmount);
        BigDecimal balanceAmount = netAmount.subtract(amountPaid);
        if (balanceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Amount paid cannot exceed net amount");
        }

        Purchase purchase = Purchase.builder()
                .account(account)
                .supplier(supplier)
                .purchaseDate(request.getPurchaseDate())
                .invoiceNumber(request.getInvoiceNumber().trim())
                .totalAmount(totalAmount)
                .discount(discount)
                .netAmount(netAmount)
                .paymentMode(request.getPaymentMode())
                .amountPaid(amountPaid)
                .balanceAmount(balanceAmount)
                .remarks(trimToNull(request.getRemarks()))
                .build();
        Purchase savedPurchase = purchaseRepository.save(purchase);

        for (PurchaseItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findByAccountIdAndIdAndActiveTrue(accountId, itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            product.setCurrentStock(product.getCurrentStock().add(itemRequest.getQuantity()));
            product.setPurchasePrice(itemRequest.getPurchasePrice());
            productRepository.save(product);

            purchaseItemRepository.save(PurchaseItem.builder()
                    .purchase(savedPurchase)
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .purchasePrice(itemRequest.getPurchasePrice())
                    .lineTotal(itemRequest.getQuantity().multiply(itemRequest.getPurchasePrice()))
                    .build());
        }

        if (balanceAmount.compareTo(BigDecimal.ZERO) > 0) {
            supplier.setCurrentDue(nonNull(supplier.getCurrentDue()).add(balanceAmount));
            supplierRepository.save(supplier);
            supplierPaymentLedgerRepository.save(SupplierPaymentLedger.builder()
                    .account(account)
                    .supplier(supplier)
                    .transactionDate(request.getPurchaseDate())
                    .transactionType(TransactionType.PURCHASE_CREDIT)
                    .debitAmount(balanceAmount)
                    .creditAmount(BigDecimal.ZERO)
                    .balanceAmount(supplier.getCurrentDue())
                    .paymentMode(request.getPaymentMode().name())
                    .referenceId(String.valueOf(savedPurchase.getId()))
                    .remarks("Credit purchase")
                    .build());
        }

        return mapToDto(savedPurchase);
    }

    private PurchaseDto mapToDto(Purchase purchase) {
        List<PurchaseItemDto> items = purchaseItemRepository.findByPurchaseId(purchase.getId()).stream()
                .map(item -> PurchaseItemDto.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getProductName())
                        .quantity(item.getQuantity())
                        .purchasePrice(item.getPurchasePrice())
                        .lineTotal(item.getLineTotal())
                        .build())
                .toList();
        return PurchaseDto.builder()
                .id(purchase.getId())
                .accountId(purchase.getAccount().getId())
                .purchaseDate(purchase.getPurchaseDate())
                .supplierId(purchase.getSupplier().getId())
                .supplierName(purchase.getSupplier().getSupplierName())
                .invoiceNumber(purchase.getInvoiceNumber())
                .totalAmount(purchase.getTotalAmount())
                .discount(purchase.getDiscount())
                .netAmount(purchase.getNetAmount())
                .paymentMode(purchase.getPaymentMode())
                .amountPaid(purchase.getAmountPaid())
                .balanceAmount(purchase.getBalanceAmount())
                .remarks(purchase.getRemarks())
                .items(items)
                .createdAt(purchase.getCreatedAt())
                .build();
    }

    private BigDecimal defaultAmountPaid(PaymentMode paymentMode, BigDecimal netAmount) {
        return paymentMode == PaymentMode.CREDIT ? BigDecimal.ZERO : netAmount;
    }

    private BigDecimal nonNull(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
