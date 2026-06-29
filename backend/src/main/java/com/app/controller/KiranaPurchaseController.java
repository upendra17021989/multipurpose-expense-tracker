package com.app.controller;

import com.app.dto.PurchaseCreateRequest;
import com.app.dto.PurchaseDto;
import com.app.security.UserPrincipal;
import com.app.service.PurchaseService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/kirana/purchases")
public class KiranaPurchaseController {
    private final PurchaseService purchaseService;

    public KiranaPurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @GetMapping
    public ResponseEntity<List<PurchaseDto>> getPurchases(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(purchaseService.getPurchases(userPrincipal.getAccountId()));
    }

    @GetMapping("/range")
    public ResponseEntity<List<PurchaseDto>> getPurchasesByDateRange(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(purchaseService.getPurchasesByDateRange(userPrincipal.getAccountId(), startDate, endDate));
    }

    @GetMapping("/{purchaseId}")
    public ResponseEntity<PurchaseDto> getPurchase(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long purchaseId) {
        return ResponseEntity.ok(purchaseService.getPurchase(userPrincipal.getAccountId(), purchaseId));
    }

    @PostMapping
    public ResponseEntity<PurchaseDto> createPurchase(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody PurchaseCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(purchaseService.createPurchase(userPrincipal.getAccountId(), request));
    }

    @PutMapping("/{purchaseId}")
    public ResponseEntity<PurchaseDto> updatePurchase(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long purchaseId, @Valid @RequestBody PurchaseCreateRequest request) {
        return ResponseEntity.ok(purchaseService.updatePurchase(userPrincipal.getAccountId(), purchaseId, request));
    }

    @DeleteMapping("/{purchaseId}")
    public ResponseEntity<Void> cancelPurchase(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long purchaseId) {
        purchaseService.cancelPurchase(userPrincipal.getAccountId(), purchaseId);
        return ResponseEntity.noContent().build();
    }
}
