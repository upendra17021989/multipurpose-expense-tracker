package com.app.controller;

import com.app.dto.SupplierCreateRequest;
import com.app.dto.SupplierDto;
import com.app.security.UserPrincipal;
import com.app.service.SupplierService;
import jakarta.validation.Valid;
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

@RestController
@RequestMapping("/kirana/suppliers")
public class KiranaSupplierController {
    private final SupplierService supplierService;

    public KiranaSupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    public ResponseEntity<List<SupplierDto>> getSuppliers(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(supplierService.getSuppliers(userPrincipal.getAccountId()));
    }

    @GetMapping("/{supplierId}")
    public ResponseEntity<SupplierDto> getSupplier(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long supplierId) {
        return ResponseEntity.ok(supplierService.getSupplier(userPrincipal.getAccountId(), supplierId));
    }

    @PostMapping
    public ResponseEntity<SupplierDto> createSupplier(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody SupplierCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(supplierService.createSupplier(userPrincipal.getAccountId(), request));
    }

    @PutMapping("/{supplierId}")
    public ResponseEntity<SupplierDto> updateSupplier(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long supplierId,
            @Valid @RequestBody SupplierCreateRequest request) {
        return ResponseEntity.ok(supplierService.updateSupplier(userPrincipal.getAccountId(), supplierId, request));
    }

    @DeleteMapping("/{supplierId}")
    public ResponseEntity<Void> deleteSupplier(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long supplierId) {
        supplierService.deleteSupplier(userPrincipal.getAccountId(), supplierId);
        return ResponseEntity.noContent().build();
    }
}
