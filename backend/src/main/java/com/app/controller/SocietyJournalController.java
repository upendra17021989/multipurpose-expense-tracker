package com.app.controller;

import com.app.dto.SocietyJournalDtos;
import com.app.security.UserPrincipal;
import com.app.service.SocietyJournalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequestMapping("/society/journal-book") @RequiredArgsConstructor
public class SocietyJournalController {
    private final SocietyJournalService service;
    @GetMapping public SocietyJournalDtos.PageResult list(@AuthenticationPrincipal UserPrincipal principal, @RequestParam String financialYear,
            @RequestParam(defaultValue="") String search, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        return service.list(principal.getAccountId(), financialYear, search, page, size);
    }
    @PostMapping(value="/preview", consumes="multipart/form-data") public SocietyJournalDtos.Preview preview(@AuthenticationPrincipal UserPrincipal principal,
            @RequestPart("file") MultipartFile file, @RequestParam String financialYear) { return service.preview(principal.getAccountId(), financialYear, file); }
    @PostMapping("/import") public ResponseEntity<SocietyJournalDtos.ImportResult> confirm(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SocietyJournalDtos.ImportRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(service.confirm(principal.getAccountId(), principal.getUserId(), request)); }
}
