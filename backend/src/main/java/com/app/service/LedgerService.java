package com.app.service;

import com.app.dto.CustomerCreditLedgerDto;
import com.app.dto.LedgerPaymentRequest;
import com.app.dto.SupplierPaymentLedgerDto;
import com.app.entity.Account;
import com.app.entity.Customer;
import com.app.entity.CustomerCreditLedger;
import com.app.entity.Supplier;
import com.app.entity.SupplierPaymentLedger;
import com.app.entity.TransactionType;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.CustomerCreditLedgerRepository;
import com.app.repository.CustomerRepository;
import com.app.repository.SupplierPaymentLedgerRepository;
import com.app.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
public class LedgerService {
    private final CustomerCreditLedgerRepository customerLedgerRepository;
    private final SupplierPaymentLedgerRepository supplierLedgerRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;

    public LedgerService(
            CustomerCreditLedgerRepository customerLedgerRepository,
            SupplierPaymentLedgerRepository supplierLedgerRepository,
            CustomerRepository customerRepository,
            SupplierRepository supplierRepository) {
        this.customerLedgerRepository = customerLedgerRepository;
        this.supplierLedgerRepository = supplierLedgerRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
    }

    @Transactional(readOnly = true)
    public List<CustomerCreditLedgerDto> getCustomerLedger(Long accountId, Long customerId) {
        List<CustomerCreditLedger> entries = customerId == null
                ? customerLedgerRepository.findByAccountId(accountId)
                : customerLedgerRepository.findByAccountIdAndCustomerId(accountId, customerId);
        return entries.stream()
                .sorted(Comparator.comparing(CustomerCreditLedger::getTransactionDate).thenComparing(CustomerCreditLedger::getId).reversed())
                .map(this::mapCustomerLedger)
                .toList();
    }

    @Transactional
    public CustomerCreditLedgerDto recordCustomerPayment(Long accountId, Long customerId, LedgerPaymentRequest request) {
        Customer customer = customerRepository.findByAccountIdAndIdAndActiveTrue(accountId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        BigDecimal amount = request.getAmount();
        if (amount.compareTo(customer.getCurrentCredit()) > 0) {
            throw new ValidationException("Payment cannot exceed current customer credit");
        }

        customer.setCurrentCredit(customer.getCurrentCredit().subtract(amount));
        customerRepository.save(customer);

        Account account = new Account();
        account.setId(accountId);
        CustomerCreditLedger entry = CustomerCreditLedger.builder()
                .account(account)
                .customer(customer)
                .transactionDate(request.getTransactionDate())
                .transactionType(TransactionType.PAYMENT_RECEIVED)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(amount)
                .balanceAmount(customer.getCurrentCredit())
                .paymentMode(request.getPaymentMode().name())
                .referenceId(trimToNull(request.getReferenceId()))
                .remarks(trimToNull(request.getRemarks()))
                .build();
        return mapCustomerLedger(customerLedgerRepository.save(entry));
    }

    @Transactional(readOnly = true)
    public List<SupplierPaymentLedgerDto> getSupplierLedger(Long accountId, Long supplierId) {
        List<SupplierPaymentLedger> entries = supplierId == null
                ? supplierLedgerRepository.findByAccountId(accountId)
                : supplierLedgerRepository.findByAccountIdAndSupplierId(accountId, supplierId);
        return entries.stream()
                .sorted(Comparator.comparing(SupplierPaymentLedger::getTransactionDate).thenComparing(SupplierPaymentLedger::getId).reversed())
                .map(this::mapSupplierLedger)
                .toList();
    }

    @Transactional
    public SupplierPaymentLedgerDto recordSupplierPayment(Long accountId, Long supplierId, LedgerPaymentRequest request) {
        Supplier supplier = supplierRepository.findByAccountIdAndIdAndActiveTrue(accountId, supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
        BigDecimal amount = request.getAmount();
        if (amount.compareTo(supplier.getCurrentDue()) > 0) {
            throw new ValidationException("Payment cannot exceed current supplier due");
        }

        supplier.setCurrentDue(supplier.getCurrentDue().subtract(amount));
        supplierRepository.save(supplier);

        Account account = new Account();
        account.setId(accountId);
        SupplierPaymentLedger entry = SupplierPaymentLedger.builder()
                .account(account)
                .supplier(supplier)
                .transactionDate(request.getTransactionDate())
                .transactionType(TransactionType.PAYMENT_MADE)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(amount)
                .balanceAmount(supplier.getCurrentDue())
                .paymentMode(request.getPaymentMode().name())
                .referenceId(trimToNull(request.getReferenceId()))
                .remarks(trimToNull(request.getRemarks()))
                .build();
        return mapSupplierLedger(supplierLedgerRepository.save(entry));
    }

    private CustomerCreditLedgerDto mapCustomerLedger(CustomerCreditLedger entry) {
        return CustomerCreditLedgerDto.builder()
                .id(entry.getId())
                .customerId(entry.getCustomer().getId())
                .customerName(entry.getCustomer().getCustomerName())
                .transactionDate(entry.getTransactionDate())
                .transactionType(entry.getTransactionType())
                .debitAmount(entry.getDebitAmount())
                .creditAmount(entry.getCreditAmount())
                .balanceAmount(entry.getBalanceAmount())
                .paymentMode(entry.getPaymentMode())
                .referenceId(entry.getReferenceId())
                .remarks(entry.getRemarks())
                .createdAt(entry.getCreatedAt())
                .build();
    }

    private SupplierPaymentLedgerDto mapSupplierLedger(SupplierPaymentLedger entry) {
        return SupplierPaymentLedgerDto.builder()
                .id(entry.getId())
                .supplierId(entry.getSupplier().getId())
                .supplierName(entry.getSupplier().getSupplierName())
                .transactionDate(entry.getTransactionDate())
                .transactionType(entry.getTransactionType())
                .debitAmount(entry.getDebitAmount())
                .creditAmount(entry.getCreditAmount())
                .balanceAmount(entry.getBalanceAmount())
                .paymentMode(entry.getPaymentMode())
                .referenceId(entry.getReferenceId())
                .remarks(entry.getRemarks())
                .createdAt(entry.getCreatedAt())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
