package com.app.controller;

import com.app.dto.FestivalCouponDtos.*;
import com.app.security.UserPrincipal;
import com.app.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor
@RequestMapping("/society/festivals/{festivalId}/coupons")
public class FestivalCouponController {
    private final FestivalCouponService service;
    private final FestivalCouponPdfService pdf;
    @GetMapping("/dashboard") public Dashboard dashboard(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long festivalId) { return service.dashboard(p.getAccountId(), p.getUserId(), festivalId); }
    @GetMapping public List<Coupon> list(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long festivalId) { return service.list(p.getAccountId(), p.getUserId(), festivalId); }
    @PutMapping("/settings") public Settings settings(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long festivalId, @Valid @RequestBody SettingsRequest r) { return service.saveSettings(p.getAccountId(), p.getUserId(), festivalId, r); }
    @PutMapping("/entitlements/{collectionId}") public Eligibility entitlement(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long festivalId, @PathVariable Long collectionId, @Valid @RequestBody EntitlementRequest r) { return service.saveOverride(p.getAccountId(), p.getUserId(), festivalId, collectionId, r); }
    @PostMapping("/generate") public GenerationResult generate(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long festivalId) { return service.generate(p.getAccountId(), p.getUserId(), festivalId); }
    @PostMapping("/{couponId}/cancel") public Coupon cancel(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long festivalId, @PathVariable Long couponId) { return service.cancel(p.getAccountId(), p.getUserId(), festivalId, couponId); }
    @GetMapping(value = "/pdf", produces = "application/pdf") public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long festivalId) { return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=festival-coupons-" + festivalId + ".pdf").header(HttpHeaders.CACHE_CONTROL, "no-store").body(pdf.export(p.getAccountId(), p.getUserId(), festivalId)); }
}
