package com.app.service;

import com.app.dto.SupplierCreateRequest;
import com.app.dto.SupplierDto;
import com.app.entity.Account;
import com.app.entity.Supplier;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SupplierService {
    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Transactional(readOnly = true)
    public List<SupplierDto> getSuppliers(Long accountId) {
        return supplierRepository.findByAccountIdAndActiveTrue(accountId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public SupplierDto getSupplier(Long accountId, Long supplierId) {
        return mapToDto(findSupplier(accountId, supplierId));
    }

    @Transactional
    public SupplierDto createSupplier(Long accountId, SupplierCreateRequest request) {
        Account account = new Account();
        account.setId(accountId);
        BigDecimal openingBalance = nonNull(request.getOpeningBalance());

        Supplier supplier = Supplier.builder()
                .account(account)
                .supplierName(request.getSupplierName().trim())
                .mobile(request.getMobile().trim())
                .email(trimToNull(request.getEmail()))
                .address(trimToNull(request.getAddress()))
                .openingBalance(openingBalance)
                .currentDue(openingBalance)
                .active(true)
                .build();

        return mapToDto(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierDto updateSupplier(Long accountId, Long supplierId, SupplierCreateRequest request) {
        Supplier supplier = findSupplier(accountId, supplierId);
        BigDecimal oldOpening = nonNull(supplier.getOpeningBalance());
        BigDecimal newOpening = nonNull(request.getOpeningBalance());

        supplier.setSupplierName(request.getSupplierName().trim());
        supplier.setMobile(request.getMobile().trim());
        supplier.setEmail(trimToNull(request.getEmail()));
        supplier.setAddress(trimToNull(request.getAddress()));
        supplier.setOpeningBalance(newOpening);
        supplier.setCurrentDue(nonNull(supplier.getCurrentDue()).subtract(oldOpening).add(newOpening));

        return mapToDto(supplierRepository.save(supplier));
    }

    @Transactional
    public void deleteSupplier(Long accountId, Long supplierId) {
        Supplier supplier = findSupplier(accountId, supplierId);
        supplier.setActive(false);
        supplierRepository.save(supplier);
    }

    private Supplier findSupplier(Long accountId, Long supplierId) {
        return supplierRepository.findByAccountIdAndIdAndActiveTrue(accountId, supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
    }

    private SupplierDto mapToDto(Supplier supplier) {
        return SupplierDto.builder()
                .id(supplier.getId())
                .accountId(supplier.getAccount().getId())
                .supplierName(supplier.getSupplierName())
                .mobile(supplier.getMobile())
                .email(supplier.getEmail())
                .address(supplier.getAddress())
                .openingBalance(supplier.getOpeningBalance())
                .currentDue(supplier.getCurrentDue())
                .active(supplier.getActive())
                .createdAt(supplier.getCreatedAt())
                .build();
    }

    private BigDecimal nonNull(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
