package com.app.service;

import com.app.dto.SocietyJournalDtos;
import com.app.entity.*;
import com.app.repository.*;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SocietyJournalServiceTest {
    @Mock AccountRepository accounts;
    @Mock UserRepository users;
    @Mock FlatRepository flats;
    @Mock SocietyJournalEntryRepository journals;
    SocietyJournalService service;

    @BeforeEach void setUp() { service = new SocietyJournalService(accounts, users, flats, journals); }

    @Test
    void groupsTwoRowsIntoBalancedVoucherAndMatchesFlat() throws Exception {
        Account account = Account.builder().id(3L).accountType(AccountType.SOCIETY).build();
        Flat flat = Flat.builder().id(103L).account(account).blockName("L").flatNumber("103").ownerName("Member").active(true).build();
        when(accounts.findById(3L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(3L)).thenReturn(List.of(flat));
        when(journals.existsByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(3L, "2026-2027", "DN/138/26-27")).thenReturn(false);

        SocietyJournalDtos.Preview preview = service.preview(3L, "2026-2027", workbook(true));

        assertThat(preview.getTotalVouchers()).isEqualTo(1);
        assertThat(preview.getReadyVouchers()).isEqualTo(1);
        assertThat(preview.getVouchers().get(0).isBalanced()).isTrue();
        assertThat(preview.getVouchers().get(0).getLines()).hasSize(2);
        assertThat(preview.getVouchers().get(0).getLines().get(0).getFlatId()).isEqualTo(103L);
        assertThat(preview.getVouchers().get(0).getNarration()).isEqualTo("Being DPC added for July Month");
    }

    @Test
    void preventsAnUnbalancedVoucherFromBeingReady() throws Exception {
        Account account = Account.builder().id(3L).accountType(AccountType.SOCIETY).build();
        Flat flat = Flat.builder().id(103L).account(account).blockName("L").flatNumber("103").ownerName("Member").active(true).build();
        when(accounts.findById(3L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(3L)).thenReturn(List.of(flat));
        when(journals.existsByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(3L, "2026-2027", "DN/138/26-27")).thenReturn(false);

        SocietyJournalDtos.Preview preview = service.preview(3L, "2026-2027", workbook(false));

        assertThat(preview.getReadyVouchers()).isZero();
        assertThat(preview.getVouchers().get(0).getErrors()).contains("At least two journal lines are required", "Voucher is not balanced");
    }

    @Test
    void matchesShopWhenItsLabelAndFlatNumberNormalizeToTheSameValue() throws Exception {
        Account account = Account.builder().id(3L).accountType(AccountType.SOCIETY).build();
        Flat shop = Flat.builder().id(20L).account(account).blockName("").flatNumber("Shop-1").ownerName("Shop-1").active(true).build();
        when(accounts.findById(3L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(3L)).thenReturn(List.of(shop));
        when(journals.existsByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(3L, "2026-2027", "DN/138/26-27")).thenReturn(false);

        SocietyJournalDtos.Preview preview = service.preview(3L, "2026-2027", workbook(true, "Shop-1"));

        assertThat(preview.getReadyVouchers()).isEqualTo(1);
        assertThat(preview.getVouchers().get(0).getLines().get(0).getFlatId()).isEqualTo(20L);
    }

    @Test
    void readsLedgerAndMatchesFlatFromTowerFlatColumns() throws Exception {
        Account account = Account.builder().id(3L).accountType(AccountType.SOCIETY).build();
        Flat flat = Flat.builder().id(103L).account(account).blockName("H Block").flatNumber("103").ownerName("Mukesh solanki").active(true).build();
        when(accounts.findById(3L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(3L)).thenReturn(List.of(flat));
        when(journals.existsByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(3L, "2026-2027", "IN/1715/26-27")).thenReturn(false);

        SocietyJournalDtos.Preview preview = service.preview(3L, "2026-2027", sampleWorkbook());

        SocietyJournalDtos.Voucher voucher = preview.getVouchers().get(0);
        assertThat(preview.getReadyVouchers()).isEqualTo(1);
        assertThat(voucher.getLines().get(0).getLedgerName()).isEqualTo("Mukesh solanki");
        assertThat(voucher.getLines().get(0).getFlatId()).isEqualTo(103L);
        assertThat(voucher.getLines().get(1).getLedgerName()).isEqualTo("Common Area Maintenance Charges");
        assertThat(voucher.getNarration()).isEqualTo("Maintenance Bill for the Period of August 2026");
    }

    @Test
    void linksCreditNoteCreditLineToFlatForFinancialLedger() throws Exception {
        Account account = Account.builder().id(3L).accountType(AccountType.SOCIETY).build();
        Flat flat = Flat.builder().id(103L).account(account).blockName("H Block").flatNumber("103").ownerName("Mukesh solanki").active(true).build();
        when(accounts.findById(3L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(3L)).thenReturn(List.of(flat));
        when(journals.existsByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(3L, "2026-2027", "CN/1/26-27")).thenReturn(false);

        SocietyJournalDtos.Preview preview = service.preview(3L, "2026-2027", creditNoteWorkbook());

        SocietyJournalDtos.Voucher voucher = preview.getVouchers().get(0);
        assertThat(preview.getReadyVouchers()).isEqualTo(1);
        assertThat(voucher.getLines()).filteredOn(line -> line.getCredit().signum() > 0)
                .singleElement().extracting(SocietyJournalDtos.Line::getFlatId).isEqualTo(103L);
    }

    private MockMultipartFile workbook(boolean includeCredit) throws Exception {
        return workbook(includeCredit, "L-103");
    }

    private MockMultipartFile workbook(boolean includeCredit, String debitLedger) throws Exception {
        byte[] bytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Journal");
            var header = sheet.createRow(0);
            String[] headings = {"#", "Date", "Particulars", "Reference No.", "Voucher Type", "Voucher No (Voucher Type)", "Debit", "Credit"};
            for (int index = 0; index < headings.length; index++) header.createCell(index).setCellValue(headings[index]);
            var debit = sheet.createRow(1);
            debit.createCell(0).setCellValue(1); debit.createCell(1).setCellValue(LocalDate.of(2026, 7, 18));
            debit.createCell(2).setCellValue(debitLedger + "\nBeing DPC added for July Month"); debit.createCell(3).setCellValue("CAM/1303/26-27");
            debit.createCell(4).setCellValue("Debit Note"); debit.createCell(5).setCellValue("DN/138/26-27"); debit.createCell(6).setCellValue(300);
            if (includeCredit) { var credit = sheet.createRow(2); credit.createCell(2).setCellValue("Delay Payment Charges (DPC)"); credit.createCell(7).setCellValue(300); }
            workbook.write(output); bytes = output.toByteArray();
        }
        return new MockMultipartFile("file", "journal.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    private MockMultipartFile sampleWorkbook() throws Exception {
        byte[] bytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Journal");
            var header = sheet.createRow(0);
            String[] headings = {"#", "Tower/Flat", "Date", "Ledger Name", "Particulars", "Reference No.", "Voucher Type", "Voucher No (Voucher Type)", "Debit", "Credit", "GST No"};
            for (int index = 0; index < headings.length; index++) header.createCell(index).setCellValue(headings[index]);
            var debit = sheet.createRow(1);
            debit.createCell(0).setCellValue(1); debit.createCell(1).setCellValue("H Block-103"); debit.createCell(2).setCellValue("01-Aug-2026");
            debit.createCell(3).setCellValue("Mukesh solanki"); debit.createCell(4).setCellValue("Maintenance Bill for the Period of August 2026");
            debit.createCell(5).setCellValue("CAM/1529/26-27"); debit.createCell(6).setCellValue("Invoice"); debit.createCell(7).setCellValue("IN/1715/26-27"); debit.createCell(8).setCellValue(1800);
            var credit = sheet.createRow(2);
            credit.createCell(4).setCellValue("Common Area Maintenance Charges"); credit.createCell(9).setCellValue(1800);
            workbook.write(output); bytes = output.toByteArray();
        }
        return new MockMultipartFile("file", "journal-sample.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    private MockMultipartFile creditNoteWorkbook() throws Exception {
        byte[] bytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Journal");
            var header = sheet.createRow(0);
            String[] headings = {"#", "Tower/Flat", "Date", "Ledger Name", "Particulars", "Reference No.", "Voucher Type", "Voucher No (Voucher Type)", "Debit", "Credit"};
            for (int index = 0; index < headings.length; index++) header.createCell(index).setCellValue(headings[index]);
            var credit = sheet.createRow(1);
            credit.createCell(0).setCellValue(1); credit.createCell(1).setCellValue("H Block-103"); credit.createCell(2).setCellValue("01-Aug-2026");
            credit.createCell(3).setCellValue("Mukesh solanki"); credit.createCell(4).setCellValue("Maintenance adjustment");
            credit.createCell(5).setCellValue("CAM/CN/1"); credit.createCell(6).setCellValue("Credit Note"); credit.createCell(7).setCellValue("CN/1/26-27"); credit.createCell(9).setCellValue(500);
            var debit = sheet.createRow(2);
            debit.createCell(4).setCellValue("Common Area Maintenance Charges"); debit.createCell(8).setCellValue(500);
            workbook.write(output); bytes = output.toByteArray();
        }
        return new MockMultipartFile("file", "credit-note.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }
}
