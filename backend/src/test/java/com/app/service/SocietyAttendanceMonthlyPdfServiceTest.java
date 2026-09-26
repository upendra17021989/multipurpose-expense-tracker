package com.app.service;

import com.app.dto.SocietyAttendanceReportDtos.DailyRow;
import com.app.dto.SocietyAttendanceReportDtos.MonthlyReport;
import com.app.dto.SocietyAttendanceReportDtos.MonthlyWorkerRow;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SocietyAttendanceMonthlyPdfServiceTest {
    @Test
    void rendersLatinDevanagariAndGujaratiWorkerNames() throws Exception {
        SocietyAttendanceReportService reports = mock(SocietyAttendanceReportService.class);
        MonthlyWorkerRow worker = MonthlyWorkerRow.builder()
                .workerName("Ajay राज પટેલ").agencyName("Agency")
                .recordedDays(1).presentDays(1)
                .attendanceDays(List.of(DailyRow.builder()
                        .attendanceDate(LocalDate.of(2026, 9, 1)).status("PRESENT")
                        .shiftName("Morning").postName("Gate").build()))
                .build();
        when(reports.monthly(1L, 2026, 9)).thenReturn(MonthlyReport.builder()
                .year(2026).month(9).totalRecords(1).workers(List.of(worker)).build());

        byte[] bytes = new SocietyAttendanceMonthlyPdfService(reports).export(1L, 2026, 9);
        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(bytes)))) {
            String text = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            assertTrue(text.contains("Ajay"), text);
            assertTrue(text.contains("राज"), text);
            assertTrue(text.contains("પટેલ"), text);
        }
    }
}
