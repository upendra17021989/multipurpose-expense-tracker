package com.app.controller;

import com.app.dto.SaleCreateRequest;
import com.app.dto.SaleDto;
import com.app.security.UserPrincipal;
import com.app.service.SaleService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/kirana/sales")
public class KiranaSalesController {
    private final SaleService saleService;

    public KiranaSalesController(SaleService saleService) {
        this.saleService = saleService;
    }

    @GetMapping
    public ResponseEntity<List<SaleDto>> getSales(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(saleService.getSales(userPrincipal.getAccountId()));
    }

    @GetMapping("/range")
    public ResponseEntity<List<SaleDto>> getSalesByDateRange(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(saleService.getSalesByDateRange(userPrincipal.getAccountId(), startDate, endDate));
    }

    @GetMapping("/{saleId}")
    public ResponseEntity<SaleDto> getSale(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long saleId) {
        return ResponseEntity.ok(saleService.getSale(userPrincipal.getAccountId(), saleId));
    }

    @PostMapping
    public ResponseEntity<SaleDto> createSale(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody SaleCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saleService.createSale(userPrincipal.getAccountId(), request));
    }
}
