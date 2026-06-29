package com.app.service;

import com.app.dto.SaleCreateRequest;
import com.app.dto.SaleDto;
import com.app.dto.SaleItemDto;
import com.app.dto.SaleItemRequest;
import com.app.entity.Account;
import com.app.entity.Customer;
import com.app.entity.CustomerCreditLedger;
import com.app.entity.PaymentMode;
import com.app.entity.Product;
import com.app.entity.Sale;
import com.app.entity.SaleItem;
import com.app.entity.TransactionType;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.CustomerCreditLedgerRepository;
import com.app.repository.CustomerRepository;
import com.app.repository.ProductRepository;
import com.app.repository.SaleItemRepository;
import com.app.repository.SaleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class SaleService {
    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final CustomerCreditLedgerRepository customerCreditLedgerRepository;

    public SaleService(
            SaleRepository saleRepository,
            SaleItemRepository saleItemRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            CustomerCreditLedgerRepository customerCreditLedgerRepository) {
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.customerCreditLedgerRepository = customerCreditLedgerRepository;
    }

    @Transactional(readOnly = true)
    public List<SaleDto> getSales(Long accountId) {
        return saleRepository.findByAccountId(accountId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SaleDto> getSalesByDateRange(Long accountId, LocalDate startDate, LocalDate endDate) {
        return saleRepository.findByAccountIdAndSaleDateBetween(accountId, startDate, endDate)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public SaleDto getSale(Long accountId, Long saleId) {
        Sale sale = saleRepository.findById(saleId)
                .filter(item -> item.getAccount().getId().equals(accountId))
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
        return mapToDto(sale);
    }

    @Transactional
    public SaleDto createSale(Long accountId, SaleCreateRequest request) {
        Account account = new Account();
        account.setId(accountId);
        Customer customer = findCustomer(accountId, request.getCustomerId());
        BigDecimal discount = nonNull(request.getDiscount());
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (SaleItemRequest itemRequest : request.getItems()) {
            Product product = findProduct(accountId, itemRequest.getProductId());
            BigDecimal quantity = itemRequest.getQuantity();
            if (product.getCurrentStock().compareTo(quantity) < 0) {
                throw new ValidationException("Insufficient stock for " + product.getProductName());
            }
            BigDecimal sellingPrice = itemRequest.getSellingPrice() != null ? itemRequest.getSellingPrice() : product.getSellingPrice();
            totalAmount = totalAmount.add(quantity.multiply(sellingPrice));
        }

        BigDecimal netAmount = totalAmount.subtract(discount);
        if (netAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Discount cannot be greater than total amount");
        }

        BigDecimal amountPaid = request.getAmountPaid() != null ? request.getAmountPaid() : defaultAmountPaid(request.getPaymentMode(), netAmount);
        BigDecimal balanceAmount = netAmount.subtract(amountPaid);
        if (balanceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Amount paid cannot exceed net amount");
        }
        if (balanceAmount.compareTo(BigDecimal.ZERO) > 0 && customer == null) {
            throw new ValidationException("Customer is required when sale has pending credit");
        }

        Sale sale = Sale.builder()
                .account(account)
                .customer(customer)
                .saleDate(request.getSaleDate())
                .totalAmount(totalAmount)
                .discount(discount)
                .netAmount(netAmount)
                .paymentMode(request.getPaymentMode())
                .amountPaid(amountPaid)
                .balanceAmount(balanceAmount)
                .remarks(trimToNull(request.getRemarks()))
                .build();
        Sale savedSale = saleRepository.save(sale);

        for (SaleItemRequest itemRequest : request.getItems()) {
            Product product = findProduct(accountId, itemRequest.getProductId());
            BigDecimal sellingPrice = itemRequest.getSellingPrice() != null ? itemRequest.getSellingPrice() : product.getSellingPrice();
            BigDecimal quantity = itemRequest.getQuantity();
            product.setCurrentStock(product.getCurrentStock().subtract(quantity));
            productRepository.save(product);

            saleItemRepository.save(SaleItem.builder()
                    .sale(savedSale)
                    .product(product)
                    .quantity(quantity)
                    .sellingPrice(sellingPrice)
                    .lineTotal(quantity.multiply(sellingPrice))
                    .build());
        }

        if (balanceAmount.compareTo(BigDecimal.ZERO) > 0) {
            customer.setCurrentCredit(nonNull(customer.getCurrentCredit()).add(balanceAmount));
            customerRepository.save(customer);
            customerCreditLedgerRepository.save(CustomerCreditLedger.builder()
                    .account(account)
                    .customer(customer)
                    .transactionDate(request.getSaleDate())
                    .transactionType(TransactionType.SALE_CREDIT)
                    .debitAmount(balanceAmount)
                    .creditAmount(BigDecimal.ZERO)
                    .balanceAmount(customer.getCurrentCredit())
                    .paymentMode(request.getPaymentMode().name())
                    .referenceId(String.valueOf(savedSale.getId()))
                    .remarks("Credit sale")
                    .build());
        }

        return mapToDto(savedSale);
    }

    @Transactional
    public SaleDto updateSale(Long accountId, Long saleId, SaleCreateRequest request) {
        cancelSale(accountId, saleId);
        return createSale(accountId, request);
    }

    @Transactional
    public void cancelSale(Long accountId, Long saleId) {
        Sale sale = findSale(accountId, saleId);
        List<SaleItem> items = saleItemRepository.findBySaleId(saleId);
        for (SaleItem item : items) {
            Product product = item.getProduct();
            product.setCurrentStock(product.getCurrentStock().add(item.getQuantity()));
            productRepository.save(product);
        }
        if (sale.getCustomer() != null && nonNull(sale.getBalanceAmount()).compareTo(BigDecimal.ZERO) > 0) {
            Customer customer = sale.getCustomer();
            BigDecimal revisedCredit = nonNull(customer.getCurrentCredit()).subtract(sale.getBalanceAmount());
            if (revisedCredit.compareTo(BigDecimal.ZERO) < 0) {
                throw new ValidationException("Cannot cancel sale after payments have been applied to its credit");
            }
            customer.setCurrentCredit(revisedCredit);
            customerRepository.save(customer);
            customerCreditLedgerRepository.findByAccountIdAndReferenceIdAndTransactionType(accountId, String.valueOf(saleId), TransactionType.SALE_CREDIT)
                    .ifPresent(customerCreditLedgerRepository::delete);
        }
        saleItemRepository.deleteAll(items);
        saleRepository.delete(sale);
    }

    private Sale findSale(Long accountId, Long saleId) {
        return saleRepository.findById(saleId)
                .filter(item -> item.getAccount().getId().equals(accountId))
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
    }

    private Product findProduct(Long accountId, Long productId) {
        return productRepository.findByAccountIdAndIdAndActiveTrue(accountId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    private Customer findCustomer(Long accountId, Long customerId) {
        if (customerId == null) return null;
        return customerRepository.findByAccountIdAndIdAndActiveTrue(accountId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }

    private SaleDto mapToDto(Sale sale) {
        List<SaleItemDto> items = saleItemRepository.findBySaleId(sale.getId())
                .stream()
                .map(item -> SaleItemDto.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getProductName())
                        .quantity(item.getQuantity())
                        .sellingPrice(item.getSellingPrice())
                        .lineTotal(item.getLineTotal())
                        .build())
                .toList();

        return SaleDto.builder()
                .id(sale.getId())
                .accountId(sale.getAccount().getId())
                .saleDate(sale.getSaleDate())
                .customerId(sale.getCustomer() != null ? sale.getCustomer().getId() : null)
                .customerName(sale.getCustomer() != null ? sale.getCustomer().getCustomerName() : null)
                .totalAmount(sale.getTotalAmount())
                .discount(sale.getDiscount())
                .netAmount(sale.getNetAmount())
                .paymentMode(sale.getPaymentMode())
                .amountPaid(sale.getAmountPaid())
                .balanceAmount(sale.getBalanceAmount())
                .remarks(sale.getRemarks())
                .items(items)
                .createdAt(sale.getCreatedAt())
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
