package com.app.service;

import com.app.dto.ExpenseImportDtos;
import com.app.entity.*;
import com.app.repository.AccountRepository;
import com.app.repository.ExpenseCategoryRepository;
import com.app.repository.ExpenseRepository;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpenseImportServiceTest {
    @Mock AccountRepository accounts;
    @Mock ExpenseCategoryRepository categories;
    @Mock ExpenseRepository expenses;
    ExpenseImportService service;

    @BeforeEach
    void setUp() { service = new ExpenseImportService(accounts, categories, expenses); }

    @Test
    void previewsDebitAndSkipsCreditRows() throws Exception {
        Account account = Account.builder().id(7L).accountType(AccountType.SOCIETY).build();
        ExpenseCategory electricity = ExpenseCategory.builder().id(9L).account(account)
                .categoryName("Electricity").accountType(AccountType.SOCIETY)
                .categoryType(CategoryType.SOCIETY_REGULAR).active(true).build();
        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        when(categories.findByAccountIdAndActiveTrue(7L)).thenReturn(List.of(electricity));
        when(expenses.findByAccountIdAndSourceReferenceAndSoftDeletedFalse(7L, "BANK:GSCAD26133682013"))
                .thenReturn(Optional.empty());

        byte[] workbook;
        try (XSSFWorkbook excel = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = excel.createSheet("Statement");
            var header = sheet.createRow(0);
            String[] names = {"Sr. No.", "Post Date", "Value Date", "Narration", "Cheque Number", "Debit Amount", "Credit Amount", "Tower No.", "Flat No.", "Remarks"};
            for (int i = 0; i < names.length; i++) header.createCell(i).setCellValue(names[i]);
            var debit = sheet.createRow(1);
            debit.createCell(0).setCellValue(477); debit.createCell(1).setCellValue(46155);
            debit.createCell(2).setCellValue(46155); debit.createCell(3).setCellValue("NEFT UTTARGUJARATVIJC GSCAD26133682013 BARB0ALKAPU");
            debit.createCell(4).setCellValue(0); debit.createCell(5).setCellValue(200); debit.createCell(6).setCellValue(0);
            debit.createCell(9).setCellValue("UGVCL Meter Number 77804254130");
            var credit = sheet.createRow(2); credit.createCell(5).setCellValue(0); credit.createCell(6).setCellValue(500);
            excel.write(output); workbook = output.toByteArray();
        }

        ExpenseImportDtos.Preview preview = service.preview(7L,
                new MockMultipartFile("file", "statement.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", workbook));

        assertThat(preview.getTotalRows()).isEqualTo(1);
        assertThat(preview.getSkippedRows()).isEqualTo(1);
        assertThat(preview.getTotalDebit()).isEqualByComparingTo(new BigDecimal("200"));
        assertThat(preview.getRows().get(0).getExpenseDate()).hasToString("2026-05-13");
        assertThat(preview.getRows().get(0).getCategoryId()).isEqualTo(9L);
        assertThat(preview.getRows().get(0).getPaymentMode()).isEqualTo(PaymentMode.NEFT);
        assertThat(preview.getRows().get(0).getTransactionId()).isEqualTo("GSCAD26133682013");
        assertThat(preview.getRows().get(0).getUtr()).isEqualTo("GSCAD26133682013");
    }
}
