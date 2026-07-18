package com.app.controller;
import com.app.dto.*;
import com.app.security.UserPrincipal;
import com.app.service.SocietyAnnualCollectionService;
import com.app.service.SocietyBankBookImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import java.math.BigDecimal;
import java.util.*;
@RestController @RequestMapping("/society/annual-collections") @RequiredArgsConstructor
public class SocietyAnnualCollectionController {
    private final SocietyAnnualCollectionService service;
    private final SocietyBankBookImportService bankBookImportService;
    @PostMapping(value="/bank-book/preview", consumes="multipart/form-data") public SocietyBankBookImportDtos.Preview previewBankBook(@AuthenticationPrincipal UserPrincipal p,@RequestPart("file") MultipartFile file,@RequestParam("financialYear") String financialYear){return bankBookImportService.preview(p.getAccountId(),financialYear,file);}
    @PostMapping("/bank-book/import") public ResponseEntity<SocietyBankBookImportDtos.Result> importBankBook(@AuthenticationPrincipal UserPrincipal p,@Valid @RequestBody SocietyBankBookImportDtos.ConfirmRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(bankBookImportService.confirm(p.getAccountId(),p.getUserId(),r));}
    @GetMapping public Page<SocietyAnnualCollectionDto> list(@AuthenticationPrincipal UserPrincipal p, @RequestParam String financialYear,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size,
            @RequestParam(defaultValue="") String search) { return service.page(p.getAccountId(), financialYear, search, page, size); }
    @GetMapping("/ledger") public List<SocietyAnnualCollectionDto> ledger(@AuthenticationPrincipal UserPrincipal p, @RequestParam String financialYear, @RequestParam(required=false) Long flatId) { return service.ledger(p.getAccountId(), p.getUserId(), financialYear, flatId); }
    @GetMapping("/summary") public Map<String, BigDecimal> summary(@AuthenticationPrincipal UserPrincipal p, @RequestParam String financialYear) { return Map.of(
            "totalCollected", service.total(p.getAccountId(), financialYear),
            "maintenanceCollected", service.total(p.getAccountId(), financialYear, com.app.entity.SocietyCollectionType.MAINTENANCE)); }
    @PostMapping public ResponseEntity<SocietyAnnualCollectionDto> create(@AuthenticationPrincipal UserPrincipal p, @Valid @RequestBody SocietyAnnualCollectionRequest r) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(p.getAccountId(), r)); }
    @PutMapping("/{id}") public SocietyAnnualCollectionDto update(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long id, @Valid @RequestBody SocietyAnnualCollectionRequest r) { return service.update(p.getAccountId(), id, r); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal p, @PathVariable Long id) { service.delete(p.getAccountId(), id); return ResponseEntity.noContent().build(); }
}
