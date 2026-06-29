package com.app.controller;

import com.app.dto.SupplierCreateRequest;
import com.app.dto.SupplierDto;
import com.app.security.UserPrincipal;
import com.app.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/society/vendors")
public class SocietyVendorController {
    private final SupplierService supplierService;
    public SocietyVendorController(SupplierService supplierService) { this.supplierService = supplierService; }

    @GetMapping
    public ResponseEntity<List<SupplierDto>> getVendors(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(supplierService.getSuppliers(principal.getAccountId()));
    }
    @GetMapping("/{vendorId}")
    public ResponseEntity<SupplierDto> getVendor(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long vendorId) {
        return ResponseEntity.ok(supplierService.getSupplier(principal.getAccountId(), vendorId));
    }
    @PostMapping
    public ResponseEntity<SupplierDto> createVendor(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody SupplierCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.createSupplier(principal.getAccountId(), request));
    }
    @PutMapping("/{vendorId}")
    public ResponseEntity<SupplierDto> updateVendor(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long vendorId, @Valid @RequestBody SupplierCreateRequest request) {
        return ResponseEntity.ok(supplierService.updateSupplier(principal.getAccountId(), vendorId, request));
    }
    @DeleteMapping("/{vendorId}")
    public ResponseEntity<Void> deleteVendor(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long vendorId) {
        supplierService.deleteSupplier(principal.getAccountId(), vendorId);
        return ResponseEntity.noContent().build();
    }
}
