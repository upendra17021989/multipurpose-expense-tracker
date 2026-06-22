package com.app.controller;

import com.app.dto.FestivalEventCreateRequest;
import com.app.dto.FestivalEventDto;
import com.app.entity.FestivalEventStatus;
import com.app.security.UserPrincipal;
import com.app.service.FestivalEventService;
import jakarta.validation.Valid;
import lombok.Data;
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
@RequestMapping("/society/festivals")
public class FestivalEventController {

    private final FestivalEventService festivalEventService;

    public FestivalEventController(FestivalEventService festivalEventService) {
        this.festivalEventService = festivalEventService;
    }

    @GetMapping
    public ResponseEntity<List<FestivalEventDto>> getFestivalEvents(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) Integer year) {
        log.info("Fetching festival events for account: {}", userPrincipal.getAccountId());
        return ResponseEntity.ok(festivalEventService.getFestivalEvents(userPrincipal.getAccountId(), year));
    }

    @GetMapping("/{festivalEventId}")
    public ResponseEntity<FestivalEventDto> getFestivalEvent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long festivalEventId) {
        return ResponseEntity.ok(festivalEventService.getFestivalEvent(userPrincipal.getAccountId(), festivalEventId));
    }

    @PostMapping
    public ResponseEntity<FestivalEventDto> createFestivalEvent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody FestivalEventCreateRequest request) {
        FestivalEventDto created = festivalEventService.createFestivalEvent(userPrincipal.getAccountId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{festivalEventId}")
    public ResponseEntity<FestivalEventDto> updateFestivalEvent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long festivalEventId,
            @Valid @RequestBody FestivalEventCreateRequest request) {
        return ResponseEntity.ok(festivalEventService.updateFestivalEvent(userPrincipal.getAccountId(), festivalEventId, request));
    }

    @PutMapping("/{festivalEventId}/status")
    public ResponseEntity<FestivalEventDto> updateStatus(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long festivalEventId,
            @RequestBody FestivalStatusRequest request) {
        return ResponseEntity.ok(festivalEventService.updateStatus(userPrincipal.getAccountId(), festivalEventId, request.getStatus()));
    }

    @DeleteMapping("/{festivalEventId}")
    public ResponseEntity<Void> deleteFestivalEvent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long festivalEventId) {
        festivalEventService.deleteFestivalEvent(userPrincipal.getAccountId(), festivalEventId);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class FestivalStatusRequest {
        private FestivalEventStatus status;
    }
}
