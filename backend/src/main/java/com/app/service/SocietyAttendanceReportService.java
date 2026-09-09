package com.app.service;

import com.app.dto.SocietyAttendanceReportDtos.*;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.AccountRepository;
import com.app.repository.SocietyAttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SocietyAttendanceReportService {
    private static final Set<String> PRESENT = Set.of("PRESENT", "LATE", "HALF_DAY", "REPLACEMENT");
    private final AccountRepository accounts;
    private final SocietyAttendanceRepository attendance;

    @Transactional(readOnly = true)
    public DailyReport daily(Long accountId, LocalDate date) {
        society(accountId);
        List<SocietyAttendance> records = attendance.findByAccountIdAndAttendanceDate(accountId, date);
        List<DailyRow> rows = records.stream().map(this::dailyRow)
                .sorted(Comparator.comparing(DailyRow::getWorkerName, String.CASE_INSENSITIVE_ORDER)).toList();
        Map<String, Long> counts = statusCounts(records);
        return DailyReport.builder().date(date).totalRecorded(records.size())
                .presentCount((int) records.stream().filter(a -> PRESENT.contains(a.getStatus())).count())
                .absentCount(counts.getOrDefault("ABSENT", 0L).intValue())
                .lateCount(counts.getOrDefault("LATE", 0L).intValue())
                .onLeaveCount(counts.getOrDefault("ON_LEAVE", 0L).intValue())
                .replacementCount((int) records.stream().filter(a -> a.getReplacementAgencyWorker() != null).count())
                .totalLateMinutes(rows.stream().mapToLong(DailyRow::getLateMinutes).sum())
                .totalOvertimeMinutes(rows.stream().mapToLong(DailyRow::getOvertimeMinutes).sum())
                .statusCounts(counts).rows(rows).build();
    }

    @Transactional(readOnly = true)
    public MonthlyReport monthly(Long accountId, int year, int month) {
        society(accountId);
        YearMonth period = YearMonth.of(year, month);
        LocalDate from = period.atDay(1), to = period.atEndOfMonth();
        List<SocietyAttendance> records = attendance
                .findByAccountIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(accountId, from, to);
        List<MonthlyWorkerRow> workers = records.stream()
                .collect(Collectors.groupingBy(this::workerKey, LinkedHashMap::new, Collectors.toList()))
                .values().stream().map(this::monthlyRow)
                .sorted(Comparator.comparing(MonthlyWorkerRow::getWorkerName, String.CASE_INSENSITIVE_ORDER)).toList();
        return MonthlyReport.builder().year(year).month(month).from(from).to(to).totalRecords(records.size())
                .statusCounts(statusCounts(records))
                .totalLateMinutes(workers.stream().mapToLong(MonthlyWorkerRow::getLateMinutes).sum())
                .totalOvertimeMinutes(workers.stream().mapToLong(MonthlyWorkerRow::getOvertimeMinutes).sum())
                .workers(workers).build();
    }

    private DailyRow dailyRow(SocietyAttendance value) {
        SocietyRosterAssignment roster = value.getRosterAssignment();
        return DailyRow.builder().attendanceId(value.getId()).workerKey(workerKey(value)).workerName(workerName(roster))
                .workerType(roster.getStaff() == null ? "AGENCY" : "DIRECT").agencyName(agencyName(roster))
                .shiftName(roster.getShift().getName()).postName(roster.getPostName()).status(value.getStatus())
                .checkIn(value.getCheckIn()).checkOut(value.getCheckOut())
                .replacementWorkerName(value.getReplacementAgencyWorker() == null ? null : value.getReplacementAgencyWorker().getWorkerName())
                .lateMinutes(lateMinutes(value)).overtimeMinutes(overtimeMinutes(value)).notes(value.getNotes()).build();
    }

    private MonthlyWorkerRow monthlyRow(List<SocietyAttendance> records) {
        SocietyAttendance first = records.get(0);
        SocietyRosterAssignment roster = first.getRosterAssignment();
        return MonthlyWorkerRow.builder().workerKey(workerKey(first)).workerName(workerName(roster))
                .workerType(roster.getStaff() == null ? "AGENCY" : "DIRECT").agencyName(agencyName(roster))
                .shiftName(roster.getShift().getName()).postName(roster.getPostName()).recordedDays(records.size())
                .presentDays(count(records, "PRESENT")).absentDays(count(records, "ABSENT"))
                .lateDays(count(records, "LATE")).halfDays(count(records, "HALF_DAY"))
                .leaveDays(count(records, "ON_LEAVE")).weeklyOffDays(count(records, "WEEKLY_OFF"))
                .holidayDays(count(records, "HOLIDAY"))
                .replacementDays(records.stream().filter(a -> a.getReplacementAgencyWorker() != null).count())
                .lateMinutes(records.stream().mapToLong(this::lateMinutes).sum())
                .overtimeMinutes(records.stream().mapToLong(this::overtimeMinutes).sum()).build();
    }

    private long count(List<SocietyAttendance> records, String status) {
        return records.stream().filter(a -> status.equals(a.getStatus())).count();
    }

    private Map<String, Long> statusCounts(List<SocietyAttendance> records) {
        return records.stream().collect(Collectors.groupingBy(SocietyAttendance::getStatus,
                LinkedHashMap::new, Collectors.counting()));
    }

    private long lateMinutes(SocietyAttendance value) {
        if (value.getCheckIn() == null) return 0;
        SocietyShift shift = value.getRosterAssignment().getShift();
        LocalTime allowed = shift.getStartTime().plusMinutes(Optional.ofNullable(shift.getGraceMinutes()).orElse(0));
        return value.getCheckIn().isAfter(allowed) ? ChronoUnit.MINUTES.between(allowed, value.getCheckIn()) : 0;
    }

    private long overtimeMinutes(SocietyAttendance value) {
        if (value.getCheckOut() == null) return 0;
        SocietyShift shift = value.getRosterAssignment().getShift();
        LocalDateTime scheduled = LocalDateTime.of(value.getAttendanceDate(), shift.getEndTime());
        LocalDateTime actual = LocalDateTime.of(value.getAttendanceDate(), value.getCheckOut());
        if (!shift.getEndTime().isAfter(shift.getStartTime())) scheduled = scheduled.plusDays(1);
        if (value.getCheckOut().isBefore(shift.getStartTime())) actual = actual.plusDays(1);
        return actual.isAfter(scheduled) ? ChronoUnit.MINUTES.between(scheduled, actual) : 0;
    }

    private String workerKey(SocietyAttendance value) {
        SocietyRosterAssignment roster = value.getRosterAssignment();
        return roster.getStaff() != null ? "STAFF:" + roster.getStaff().getId() : "AGENCY:" + roster.getAgencyWorker().getId();
    }

    private String workerName(SocietyRosterAssignment roster) {
        return roster.getStaff() != null ? roster.getStaff().getStaffName() : roster.getAgencyWorker().getWorkerName();
    }

    private String agencyName(SocietyRosterAssignment roster) {
        return roster.getAgencyWorker() == null ? null : roster.getAgencyWorker().getAgency().getName();
    }

    private void society(Long accountId) {
        accounts.findById(accountId).filter(a -> a.getAccountType() == AccountType.SOCIETY && Boolean.TRUE.equals(a.getActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Society not found"));
    }
}
