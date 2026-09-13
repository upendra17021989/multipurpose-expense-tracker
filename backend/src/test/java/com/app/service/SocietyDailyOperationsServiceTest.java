package com.app.service;

import com.app.dto.SocietyDailyOperationsDtos.ReportRequest;
import com.app.entity.*;
import com.app.exception.ValidationException;
import com.app.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SocietyDailyOperationsServiceTest {
    @Mock AccountRepository accounts;
    @Mock UserRepository users;
    @Mock SocietyDailyChecklistTemplateRepository templates;
    @Mock SocietyDailyChecklistEntryRepository entries;
    @Mock SocietyIncidentRepository incidents;
    @Mock SocietyInspectionRepository inspections;
    @Mock SocietyShiftHandoverRepository handovers;
    @Mock SocietyDailyReportRepository reports;
    @Mock SocietyAttendanceRepository attendance;
    @Mock SocietyWorkOrderRepository workOrders;
    @Mock SocietyComplaintRepository complaints;
    @Mock SocietyAuditEventRepository audit;
    @Mock ObjectMapper json;
    @InjectMocks SocietyDailyOperationsService service;

    @Test void submittedReportCannotBeSavedOrSubmittedAgain() {
        var date = LocalDate.of(2026, 9, 13);
        var account = Account.builder().id(4L).accountType(AccountType.SOCIETY).active(true).build();
        var submitted = SocietyDailyReport.builder().account(account).reportDate(date).revision(1)
                .status("SUBMITTED").snapshotJson("{}").build();
        var request = new ReportRequest();
        request.setReportDate(date);
        when(accounts.findByIdForUpdate(4L)).thenReturn(Optional.of(account));
        when(users.findById(8L)).thenReturn(Optional.of(User.builder().id(8L).build()));
        when(reports.findByAccountIdAndReportDateOrderByRevisionDesc(4L, date)).thenReturn(List.of(submitted));

        var error = assertThrows(ValidationException.class, () -> service.saveReport(4L, 8L, request, true));

        assertEquals("The daily report for this date has already been submitted", error.getMessage());
        verify(reports, never()).save(any());
        verifyNoInteractions(audit);
    }
}
