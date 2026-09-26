package com.app.service;

import com.app.dto.SocietyAttendanceReportDtos.DailyRow;
import com.app.dto.SocietyAttendanceReportDtos.MonthlyReport;
import com.app.dto.SocietyAttendanceReportDtos.MonthlyWorkerRow;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.font.FontProvider;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class SocietyAttendanceMonthlyPdfService {
    private static final DeviceRgb TEAL = new DeviceRgb(15, 118, 110);
    private final SocietyAttendanceReportService reports;

    public byte[] export(Long accountId, int year, int month) {
        MonthlyReport report = reports.monthly(accountId, year, month);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (Document document = new Document(new PdfDocument(new PdfWriter(output)), PageSize.A4.rotate())) {
            document.setFontProvider(reportFonts());
            document.setFontFamily(StandardFonts.HELVETICA, "Noto Sans Devanagari UI", "Noto Sans Gujarati UI");
            document.setMargins(32, 32, 32, 32);
            document.add(new Paragraph("Monthly attendance register")
                    .setBold().setFontSize(18).setFontColor(TEAL));
            document.add(new Paragraph(String.format("%04d-%02d  |  %d workers  |  %d records",
                    year, month, report.getWorkers().size(), report.getTotalRecords())).setFontSize(10));

            if (report.getWorkers().isEmpty()) {
                document.add(new Paragraph("No attendance was recorded for this month."));
            }
            for (MonthlyWorkerRow worker : report.getWorkers()) {
                document.add(new Paragraph(worker.getWorkerName() + "  |  " + value(worker.getAgencyName(), "Direct"))
                        .setBold().setFontSize(12).setFontColor(TEAL).setMarginTop(14).setKeepWithNext(true));
                document.add(new Paragraph(String.format(
                        "Recorded %d  |  Present %d  |  Absent %d  |  Late %d  |  Half day %d  |  Leave %d  |  Off/Holiday %d  |  Replacements %d  |  Late %d min  |  OT %d min",
                        worker.getRecordedDays(), worker.getPresentDays(), worker.getAbsentDays(), worker.getLateDays(),
                        worker.getHalfDays(), worker.getLeaveDays(), worker.getWeeklyOffDays() + worker.getHolidayDays(),
                        worker.getReplacementDays(), worker.getLateMinutes(), worker.getOvertimeMinutes()))
                        .setFontSize(8).setKeepWithNext(true));
                Table days = new Table(UnitValue.createPercentArray(new float[]{1.1f, 1.5f, 1.3f, 0.8f, 0.8f, 0.8f, 0.8f, 2.2f}))
                        .useAllAvailableWidth().setFontSize(8);
                for (String heading : new String[]{"Date", "Status", "Shift / post", "In", "Out", "Late", "OT", "Replacement / notes"}) {
                    days.addHeaderCell(new Cell().add(new Paragraph(heading).setBold()).setBackgroundColor(new DeviceRgb(231, 244, 241)));
                }
                for (DailyRow day : worker.getAttendanceDays()) {
                    add(days, day.getAttendanceDate().toString());
                    add(days, day.getStatus().replace('_', ' '));
                    add(days, value(day.getShiftName(), "-") + " / " + value(day.getPostName(), "-"));
                    add(days, time(day.getCheckIn()));
                    add(days, time(day.getCheckOut()));
                    add(days, day.getLateMinutes() + " min");
                    add(days, day.getOvertimeMinutes() + " min");
                    add(days, value(day.getReplacementWorkerName(), "") +
                            (day.getNotes() == null || day.getNotes().isBlank() ? "" :
                                    (day.getReplacementWorkerName() == null ? "" : " | ") + day.getNotes()));
                }
                document.add(days);
            }
        }
        return output.toByteArray();
    }

    private void add(Table table, String text) {
        table.addCell(new Cell().add(new Paragraph(text)));
    }

    private FontProvider reportFonts() {
        try {
            FontProvider fonts = new FontProvider();
            fonts.addStandardPdfFonts();
            addFont(fonts, "/fonts/NotoSansDevanagariUI-Regular.ttf");
            addFont(fonts, "/fonts/NotoSansGujaratiUI-Regular.ttf");
            return fonts;
        } catch (IOException error) {
            throw new IllegalStateException("Unable to load attendance PDF font", error);
        }
    }

    private void addFont(FontProvider fonts, String path) throws IOException {
        try (InputStream resource = getClass().getResourceAsStream(path)) {
            if (resource == null) throw new IllegalStateException("Attendance PDF font is missing: " + path);
            fonts.addFont(resource.readAllBytes());
        }
    }

    private String time(LocalTime value) {
        return value == null ? "-" : value.toString().substring(0, 5);
    }

    private String value(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
