package com.app.service;

import com.app.dto.SocietyBankBookImportDtos;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.Flat;
import com.app.entity.PaymentMode;
import com.app.repository.*;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SocietyBankBookImportServiceTest {
    @Mock AccountRepository accounts;
    @Mock UserRepository users;
    @Mock FlatRepository flats;
    @Mock SocietyAnnualCollectionRepository collections;
    @Mock SocietyBankBookImportRepository imports;
    @Mock SocietyBankBookTransactionRepository transactions;
    SocietyBankBookImportService service;

    @BeforeEach
    void setUp() {
        service = new SocietyBankBookImportService(accounts, users, flats, collections, imports, transactions);
    }

    @Test
    void previewsMisspelledBankReceiptAndMatchesFlat() throws Exception {
        Account account = Account.builder().id(7L).accountType(AccountType.SOCIETY).build();
        Flat flat = Flat.builder().id(12L).account(account).blockName("E Block").flatNumber("102").ownerName("Sanket Sawant").build();
        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(7L)).thenReturn(List.of(flat));
        when(transactions.existsByAccountIdAndSourceReferenceAndAnnualCollectionIsNotNull(7L, "BANKBOOK:TXN:8A9693839D48EAA4019D491291F419A0")).thenReturn(false);

        byte[] bytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Sheet1");
            var header = sheet.createRow(0);
            String[] columns = {"Date", "Type", "Flat No.", "Particulars", "Txn ID / Cheque No.", "Reference Number", "Voucher Number", "Settlement ID", "Settlement ID (Last 8 Chars)", "Debit", "Credit", "Balance"};
            for (int index = 0; index < columns.length; index++) header.createCell(index).setCellValue(columns[index]);
            var row = sheet.createRow(1);
            row.createCell(0).setCellValue(LocalDate.of(2026, 4, 1));
            row.createCell(1).setCellValue("Bank Reciept");
            row.createCell(2).setCellValue("E Block-102");
            row.createCell(3).setCellValue("By Sanket Sawant\nNarration:-Payment Successful.");
            row.createCell(4).setCellValue("8a9693839d48eaa4019d491291f419a0");
            row.createCell(5).setCellValue("CAM/116/26-27");
            row.createCell(6).setCellValue("BR/1/26-27");
            row.createCell(7).setCellValue("YESAP60917107574");
            row.createCell(9).setCellValue(1500);
            row.createCell(11).setCellValue("15,56,102.30 D");
            workbook.write(output);
            bytes = output.toByteArray();
        }

        SocietyBankBookImportDtos.Preview preview = service.preview(7L, "2026-2027",
                new MockMultipartFile("file", "bank-book.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes));

        assertThat(preview.getTotalRows()).isEqualTo(1);
        assertThat(preview.getReadyRows()).isEqualTo(1);
        assertThat(preview.getTotalAmount()).isEqualByComparingTo(new BigDecimal("1500"));
        assertThat(preview.getRows().get(0).getFlatId()).isEqualTo(12L);
        assertThat(preview.getRows().get(0).getDate()).isEqualTo(LocalDate.of(2026, 4, 1));
    }

    @Test
    void previewsCashReceiptWithoutBankTransactionColumns() throws Exception {
        Account account = Account.builder().id(7L).accountType(AccountType.SOCIETY).build();
        Flat flat = Flat.builder().id(12L).account(account).blockName("L Block").flatNumber("403").ownerName("Niraj Lathiya").build();
        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(7L)).thenReturn(List.of(flat));
        when(transactions.existsByAccountIdAndSourceReferenceAndAnnualCollectionIsNotNull(7L, "CASHBOOK:VOUCHER:CR/1/26-27")).thenReturn(false);

        byte[] bytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Cash Book");
            var header = sheet.createRow(0);
            String[] columns = {"Date", "Type", "FlatNo.", "Particulars", "Reference Number", "Voucher Number", "Debit", "Credit", "Balance"};
            for (int index = 0; index < columns.length; index++) header.createCell(index).setCellValue(columns[index]);
            var row = sheet.createRow(1);
            row.createCell(0).setCellValue("2026-04-02");
            row.createCell(1).setCellValue("Cash Reciept");
            row.createCell(2).setCellValue("L Block-403");
            row.createCell(3).setCellValue("By Niraj Lathiya Voucher No. CAM/279/26-27\nReceived as cash for pending maintenance");
            row.createCell(4).setCellValue("CAM/279/26-27");
            row.createCell(5).setCellValue("CR/1/26-27");
            row.createCell(6).setCellValue("7,800.00");
            row.createCell(8).setCellValue("10587 D");
            workbook.write(output);
            bytes = output.toByteArray();
        }

        SocietyBankBookImportDtos.Preview preview = service.preview(7L, "2026-2027",
                new MockMultipartFile("file", "cash-book.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes));

        assertThat(preview.getReadyRows()).isEqualTo(1);
        assertThat(preview.getTotalAmount()).isEqualByComparingTo("7800.00");
        assertThat(preview.getRows().get(0).getPaymentMode()).isEqualTo(PaymentMode.CASH);
        assertThat(preview.getRows().get(0).getSourceName()).isEqualTo("Niraj Lathiya");
        assertThat(preview.getRows().get(0).getSourceReference()).isEqualTo("CASHBOOK:VOUCHER:CR/1/26-27");
    }

    @Test
    void previewsHistoricalReceiptWithTwoDigitTextYear() throws Exception {
        Account account = Account.builder().id(7L).accountType(AccountType.SOCIETY).build();
        Flat flat = Flat.builder().id(12L).account(account).blockName("A Block").flatNumber("101").ownerName("Historical Owner").build();
        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(7L)).thenReturn(List.of(flat));

        byte[] bytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("2024-2025");
            var header = sheet.createRow(0);
            String[] columns = {"Date", "Type", "Flat No.", "Particulars", "Reference Number", "Voucher Number", "Debit", "Credit", "Balance"};
            for (int index = 0; index < columns.length; index++) header.createCell(index).setCellValue(columns[index]);
            var row = sheet.createRow(1);
            row.createCell(0).setCellValue("01-Apr-24");
            row.createCell(1).setCellValue("Cash Receipt");
            row.createCell(2).setCellValue("A Block-101");
            row.createCell(3).setCellValue("By Historical Owner");
            row.createCell(4).setCellValue("REF-24");
            row.createCell(5).setCellValue("CR-24");
            row.createCell(6).setCellValue(1200);
            row.createCell(8).setCellValue(1200);
            workbook.write(output);
            bytes = output.toByteArray();
        }

        SocietyBankBookImportDtos.Preview preview = service.preview(7L, "2024-2025",
                new MockMultipartFile("file", "historical.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes));

        assertThat(preview.getReadyRows()).isEqualTo(1);
        assertThat(preview.getRows().get(0).getDate()).isEqualTo(LocalDate.of(2024, 4, 1));
    }

    @Test
    void placeholderTransactionIdsDoNotCollapseHistoricalRows() throws Exception {
        Account account = Account.builder().id(7L).accountType(AccountType.SOCIETY).build();
        Flat firstFlat = Flat.builder().id(12L).account(account).blockName("K Block").flatNumber("701").ownerName("First Owner").build();
        Flat secondFlat = Flat.builder().id(13L).account(account).blockName("K Block").flatNumber("702").ownerName("Second Owner").build();
        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        when(flats.findByAccountIdAndActiveTrue(7L)).thenReturn(List.of(firstFlat, secondFlat));

        byte[] bytes;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("2024-2025");
            var header = sheet.createRow(0);
            String[] columns = {"Date", "Type", "Flat No.", "Particulars", "Txn ID / Cheque No.", "Reference Number", "Voucher Number", "Settlement ID", "Debit", "Credit", "Balance"};
            for (int index = 0; index < columns.length; index++) header.createCell(index).setCellValue(columns[index]);
            for (int index = 0; index < 2; index++) {
                var row = sheet.createRow(index + 1);
                row.createCell(0).setCellValue("20-Apr-24");
                row.createCell(1).setCellValue("Bank Reciept");
                row.createCell(2).setCellValue("K Block-70" + (index + 1));
                row.createCell(3).setCellValue(index == 0 ? "By First Owner" : "By Second Owner");
                row.createCell(4).setCellValue("NA");
                row.createCell(5).setCellValue("CAM/24-25/" + (277 + index));
                row.createCell(6).setCellValue("BR/" + (index + 1) + "/24-25");
                row.createCell(7).setCellValue("NA");
                row.createCell(8).setCellValue(index == 0 ? 19440 : 1800);
                row.createCell(10).setCellValue(25000);
            }
            workbook.write(output);
            bytes = output.toByteArray();
        }

        SocietyBankBookImportDtos.Preview preview = service.preview(7L, "2024-2025",
                new MockMultipartFile("file", "historical-na.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes));

        assertThat(preview.getReadyRows()).isEqualTo(2);
        assertThat(preview.getRows()).extracting(SocietyBankBookImportDtos.Row::getSourceReference).doesNotHaveDuplicates();
        assertThat(preview.getRows()).extracting(SocietyBankBookImportDtos.Row::getTransactionId).containsOnly("");
    }
}
