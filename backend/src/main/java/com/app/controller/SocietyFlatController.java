package com.app.controller;

import com.app.dto.FlatCreateRequest;
import com.app.dto.FlatDto;
import com.app.security.UserPrincipal;
import com.app.service.FlatService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/society/flats")
public class SocietyFlatController {

    private final FlatService flatService;

    public SocietyFlatController(FlatService flatService) {
        this.flatService = flatService;
    }

    @GetMapping
    public ResponseEntity<List<FlatDto>> getFlats(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) String blockName) {
        log.info("Fetching flats for account: {}", userPrincipal.getAccountId());
        if (blockName != null && !blockName.isBlank()) {
            return ResponseEntity.ok(flatService.getFlatsByBlock(userPrincipal.getAccountId(), blockName));
        }
        return ResponseEntity.ok(flatService.getFlatsByAccountId(userPrincipal.getAccountId()));
    }

    @GetMapping("/{flatId}")
    public ResponseEntity<FlatDto> getFlat(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long flatId) {
        log.info("Fetching flat {} for account: {}", flatId, userPrincipal.getAccountId());
        return ResponseEntity.ok(flatService.getFlatById(userPrincipal.getAccountId(), flatId));
    }

    @PostMapping
    public ResponseEntity<FlatDto> createFlat(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody FlatCreateRequest request) {
        log.info("Creating flat for account: {}", userPrincipal.getAccountId());
        FlatDto created = flatService.createFlat(userPrincipal.getAccountId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{flatId}")
    public ResponseEntity<FlatDto> updateFlat(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long flatId,
            @Valid @RequestBody FlatCreateRequest request) {
        log.info("Updating flat {} for account: {}", flatId, userPrincipal.getAccountId());
        return ResponseEntity.ok(flatService.updateFlat(userPrincipal.getAccountId(), flatId, request));
    }

    @DeleteMapping("/{flatId}")
    public ResponseEntity<Void> deleteFlat(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long flatId) {
        log.info("Deleting flat {} for account: {}", flatId, userPrincipal.getAccountId());
        flatService.deleteFlat(userPrincipal.getAccountId(), flatId);
        return ResponseEntity.noContent().build();
    }
}
