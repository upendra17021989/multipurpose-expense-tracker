package com.app.controller;

import com.app.dto.CustomerCreditLedgerDto;
import com.app.dto.LedgerPaymentRequest;
import com.app.dto.SupplierPaymentLedgerDto;
import com.app.security.UserPrincipal;
import com.app.service.LedgerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/kirana/ledgers")
public class KiranaLedgerController {
    private final LedgerService ledgerService;

    public KiranaLedgerController(LedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping("/customer-credit")
    public ResponseEntity<List<CustomerCreditLedgerDto>> getCustomerLedger(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) Long customerId) {
        return ResponseEntity.ok(ledgerService.getCustomerLedger(userPrincipal.getAccountId(), customerId));
    }

    @PostMapping("/customer-credit/{customerId}/payments")
    public ResponseEntity<CustomerCreditLedgerDto> recordCustomerPayment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long customerId,
            @Valid @RequestBody LedgerPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ledgerService.recordCustomerPayment(userPrincipal.getAccountId(), customerId, request));
    }

    @GetMapping("/supplier-payments")
    public ResponseEntity<List<SupplierPaymentLedgerDto>> getSupplierLedger(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) Long supplierId) {
        return ResponseEntity.ok(ledgerService.getSupplierLedger(userPrincipal.getAccountId(), supplierId));
    }

    @PostMapping("/supplier-payments/{supplierId}/payments")
    public ResponseEntity<SupplierPaymentLedgerDto> recordSupplierPayment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long supplierId,
            @Valid @RequestBody LedgerPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ledgerService.recordSupplierPayment(userPrincipal.getAccountId(), supplierId, request));
    }
}
