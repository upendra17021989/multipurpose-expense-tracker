package com.app.controller;

import com.app.dto.FestivalCollectionDemandRequest;
import com.app.dto.FestivalCollectionDto;
import com.app.dto.FestivalCollectionPaymentRequest;
import com.app.dto.FestivalCollectionReceiptDto;
import com.app.dto.FestivalCollectionSummaryDto;
import com.app.security.UserPrincipal;
import com.app.service.FestivalCollectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/society/festival-collections")
public class FestivalCollectionController {

    private final FestivalCollectionService festivalCollectionService;

    public FestivalCollectionController(FestivalCollectionService festivalCollectionService) {
        this.festivalCollectionService = festivalCollectionService;
    }

    @GetMapping
    public ResponseEntity<List<FestivalCollectionDto>> getCollections(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam Long festivalEventId) {
        return ResponseEntity.ok(festivalCollectionService.getCollections(userPrincipal.getAccountId(), festivalEventId));
    }

    @GetMapping("/{collectionId}")
    public ResponseEntity<FestivalCollectionDto> getCollection(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long collectionId) {
        return ResponseEntity.ok(festivalCollectionService.getCollection(userPrincipal.getAccountId(), collectionId));
    }

    @PostMapping("/generate-demand")
    public ResponseEntity<List<FestivalCollectionDto>> generateDemand(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody FestivalCollectionDemandRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(festivalCollectionService.generateDemand(userPrincipal.getAccountId(), request));
    }

    @PutMapping("/{collectionId}/demand")
    public ResponseEntity<FestivalCollectionDto> updateDemand(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long collectionId,
            @Valid @RequestBody FestivalCollectionDemandRequest request) {
        return ResponseEntity.ok(festivalCollectionService.updateDemand(userPrincipal.getAccountId(), collectionId, request));
    }

    @PostMapping("/{collectionId}/payments")
    public ResponseEntity<FestivalCollectionReceiptDto> addPayment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long collectionId,
            @Valid @RequestBody FestivalCollectionPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(festivalCollectionService.addPayment(userPrincipal.getAccountId(), collectionId, request));
    }

    @GetMapping("/{collectionId}/receipts")
    public ResponseEntity<List<FestivalCollectionReceiptDto>> getReceipts(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long collectionId) {
        return ResponseEntity.ok(festivalCollectionService.getReceipts(userPrincipal.getAccountId(), collectionId));
    }

    @GetMapping("/summary")
    public ResponseEntity<FestivalCollectionSummaryDto> getSummary(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam Long festivalEventId) {
        return ResponseEntity.ok(festivalCollectionService.getSummary(userPrincipal.getAccountId(), festivalEventId));
    }
}
