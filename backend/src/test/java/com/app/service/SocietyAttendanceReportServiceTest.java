package com.app.service;

import com.app.entity.*;
import com.app.repository.AccountRepository;
import com.app.repository.SocietyAttendanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class SocietyAttendanceReportServiceTest {
    private AccountRepository accounts;
    private SocietyAttendanceRepository attendance;
    private SocietyAttendanceReportService service;
    private Account society;

    @BeforeEach
    void setUp() {
        accounts = mock(AccountRepository.class);
        attendance = mock(SocietyAttendanceRepository.class);
        service = new SocietyAttendanceReportService(accounts, attendance);
        society = Account.builder().id(10L).accountType(AccountType.SOCIETY).active(true).build();
        when(accounts.findById(10L)).thenReturn(Optional.of(society));
    }

    @Test
    void dailyReportCalculatesLateAndOvertimeMinutes() {
        LocalDate date = LocalDate.of(2026, 9, 9);
        SocietyAttendance row = attendance(1L, "Ramesh", "LATE", date,
                LocalTime.of(9, 20), LocalTime.of(18, 30), dayShift());
        when(attendance.findByAccountIdAndAttendanceDate(10L, date)).thenReturn(List.of(row));

        var report = service.daily(10L, date);

        assertEquals(1, report.getTotalRecorded());
        assertEquals(1, report.getPresentCount());
        assertEquals(1, report.getLateCount());
        assertEquals(10, report.getTotalLateMinutes());
        assertEquals(30, report.getTotalOvertimeMinutes());
        assertEquals("STAFF:1", report.getRows().get(0).getWorkerKey());
    }

    @Test
    void monthlyReportGroupsWorkerAndHandlesNightShiftOvertime() {
        LocalDate first = LocalDate.of(2026, 9, 1);
        LocalDate second = LocalDate.of(2026, 9, 2);
        SocietyShift night = SocietyShift.builder().name("Night").startTime(LocalTime.of(22, 0))
                .endTime(LocalTime.of(6, 0)).graceMinutes(0).build();
        List<SocietyAttendance> rows = List.of(
                attendance(2L, "Amit", "PRESENT", first, LocalTime.of(22, 0), LocalTime.of(6, 30), night),
                attendance(2L, "Amit", "ABSENT", second, null, null, night));
        when(attendance.findByAccountIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(
                10L, first, LocalDate.of(2026, 9, 30))).thenReturn(rows);

        var report = service.monthly(10L, 2026, 9);

        assertEquals(2, report.getTotalRecords());
        assertEquals(1, report.getWorkers().size());
        assertEquals(2, report.getWorkers().get(0).getRecordedDays());
        assertEquals(1, report.getWorkers().get(0).getPresentDays());
        assertEquals(1, report.getWorkers().get(0).getAbsentDays());
        assertEquals(30, report.getWorkers().get(0).getOvertimeMinutes());
    }

    private SocietyShift dayShift() {
        return SocietyShift.builder().name("Morning").startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0)).graceMinutes(10).build();
    }

    private SocietyAttendance attendance(Long staffId, String name, String status, LocalDate date,
                                         LocalTime in, LocalTime out, SocietyShift shift) {
        SocietyStaff staff = SocietyStaff.builder().id(staffId).staffName(name).build();
        SocietyRosterAssignment roster = SocietyRosterAssignment.builder().id(staffId).account(society)
                .staff(staff).shift(shift).postName("Gate").build();
        return SocietyAttendance.builder().id(staffId).account(society).rosterAssignment(roster)
                .attendanceDate(date).status(status).checkIn(in).checkOut(out).build();
    }
}
