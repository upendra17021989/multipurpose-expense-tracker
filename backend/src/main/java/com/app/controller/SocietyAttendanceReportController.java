package com.app.controller;

import com.app.dto.SocietyAttendanceReportDtos.DailyReport;
import com.app.dto.SocietyAttendanceReportDtos.MonthlyReport;
import com.app.security.UserPrincipal;
import com.app.service.SocietyAttendanceReportService;
import com.app.service.SocietyAttendanceMonthlyPdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/society/attendance/reports")
@RequiredArgsConstructor
public class SocietyAttendanceReportController {
    private final SocietyAttendanceReportService service;
    private final SocietyAttendanceMonthlyPdfService monthlyPdf;

    @GetMapping("/daily")
    public DailyReport daily(@AuthenticationPrincipal UserPrincipal principal,
                             @RequestParam(required = false) LocalDate date) {
        return service.daily(principal.getAccountId(), date == null ? LocalDate.now() : date);
    }

    @GetMapping("/monthly")
    public MonthlyReport monthly(@AuthenticationPrincipal UserPrincipal principal,
                                 @RequestParam int year, @RequestParam int month) {
        return service.monthly(principal.getAccountId(), year, month);
    }

    @GetMapping("/monthly/pdf")
    public ResponseEntity<ByteArrayResource> monthlyPdf(@AuthenticationPrincipal UserPrincipal principal,
                                                        @RequestParam int year, @RequestParam int month) {
        byte[] content = monthlyPdf.export(principal.getAccountId(), year, month);
        String filename = String.format("attendance-register-%04d-%02d.pdf", year, month);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentLength(content.length).body(new ByteArrayResource(content));
    }
}
