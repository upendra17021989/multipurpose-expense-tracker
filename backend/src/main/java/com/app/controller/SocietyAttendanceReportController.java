package com.app.controller;

import com.app.dto.SocietyAttendanceReportDtos.DailyReport;
import com.app.dto.SocietyAttendanceReportDtos.MonthlyReport;
import com.app.security.UserPrincipal;
import com.app.service.SocietyAttendanceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/society/attendance/reports")
@RequiredArgsConstructor
public class SocietyAttendanceReportController {
    private final SocietyAttendanceReportService service;

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
}
