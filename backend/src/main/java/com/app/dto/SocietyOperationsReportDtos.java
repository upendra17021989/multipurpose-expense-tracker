package com.app.dto;
import lombok.*; import java.time.*; import java.util.*;
public final class SocietyOperationsReportDtos {private SocietyOperationsReportDtos(){}
 @Data @Builder public static class AgencyComplianceReport {private int year;private int month;private List<AgencyComplianceRow> agencies;}
 @Data @Builder public static class AgencyComplianceRow {private Long agencyId;private String agencyName;private Integer requiredPerDay;private long expectedAssignments;private long recordedAssignments;private long present;private long replacements;private long absent;private long shortage;private double compliancePercent;}
 @Data @Builder public static class SupervisorPerformanceReport {private LocalDate from;private LocalDate to;private List<SupervisorPerformanceRow> supervisors;}
 @Data @Builder public static class SupervisorPerformanceRow {private Long userId;private String supervisorName;private long reportsSubmitted;private long reportsAcknowledged;private long onTimeReports;private long checklistCompletions;private long incidentsRecorded;private long inspectionsCompleted;private long handoversSent;private double acknowledgementPercent;}
 public record ExportFile(String filename,String contentType,byte[] content){}
}
