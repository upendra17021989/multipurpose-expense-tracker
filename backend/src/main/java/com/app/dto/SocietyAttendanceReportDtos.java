package com.app.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public final class SocietyAttendanceReportDtos {
    private SocietyAttendanceReportDtos() {}

    @Data @Builder
    public static class DailyReport {
        private LocalDate date;
        private int totalRecorded;
        private int presentCount;
        private int absentCount;
        private int lateCount;
        private int onLeaveCount;
        private int replacementCount;
        private long totalLateMinutes;
        private long totalOvertimeMinutes;
        private Map<String, Long> statusCounts;
        private List<DailyRow> rows;
    }

    @Data @Builder
    public static class DailyRow {
        private Long attendanceId;
        private String workerKey;
        private String workerName;
        private String workerType;
        private String agencyName;
        private String shiftName;
        private String postName;
        private String status;
        private LocalTime checkIn;
        private LocalTime checkOut;
        private String replacementWorkerName;
        private long lateMinutes;
        private long overtimeMinutes;
        private String notes;
    }

    @Data @Builder
    public static class MonthlyReport {
        private int year;
        private int month;
        private LocalDate from;
        private LocalDate to;
        private int totalRecords;
        private Map<String, Long> statusCounts;
        private long totalLateMinutes;
        private long totalOvertimeMinutes;
        private List<MonthlyWorkerRow> workers;
    }

    @Data @Builder
    public static class MonthlyWorkerRow {
        private String workerKey;
        private String workerName;
        private String workerType;
        private String agencyName;
        private String shiftName;
        private String postName;
        private int recordedDays;
        private long presentDays;
        private long absentDays;
        private long lateDays;
        private long halfDays;
        private long leaveDays;
        private long weeklyOffDays;
        private long holidayDays;
        private long replacementDays;
        private long lateMinutes;
        private long overtimeMinutes;
    }
}
