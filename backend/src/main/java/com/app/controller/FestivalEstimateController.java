package com.app.controller;

import com.app.dto.FestivalEstimateRequest;
import com.app.security.UserPrincipal;
import com.app.service.FestivalEstimateService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/society/festivals/{festivalId}/estimates")
public class FestivalEstimateController {
    private final FestivalEstimateService service;
    @GetMapping public List<FestivalEstimateService.Estimate> list(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long festivalId) {
        return service.list(user.getAccountId(), festivalId);
    }
    @PostMapping public ResponseEntity<Void> create(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long festivalId, @Valid @RequestBody FestivalEstimateRequest request) {
        service.save(user.getAccountId(), festivalId, null, request);
        return ResponseEntity.status(201).build();
    }
    @PutMapping("/{id}") public ResponseEntity<Void> update(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long festivalId, @PathVariable Long id, @Valid @RequestBody FestivalEstimateRequest request) {
        service.save(user.getAccountId(), festivalId, id, request);
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long festivalId, @PathVariable Long id) {
        service.delete(user.getAccountId(), festivalId, id);
        return ResponseEntity.noContent().build();
    }
}
