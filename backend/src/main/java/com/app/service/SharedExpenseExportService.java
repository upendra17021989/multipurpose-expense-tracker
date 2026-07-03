package com.app.service;

import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.*;
import java.io.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SharedExpenseExportService {
  private final SharedExpenseGroupRepository groups;
  private final SharedGroupMemberRepository members;
  private final SharedExpenseRepository expenses;
  private final SharedExpensePayerRepository payers;
  private final SharedExpenseShareRepository shares;
  private final SharedSettlementRepository settlements;

  public ExportResult export(Long accountId, Long userId, Long groupId) {
    SharedExpenseGroup group =
        groups
            .findAccessibleById(groupId, accountId, userId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Shared expense group not found"));
    var memberRows = members.findByGroupIdOrderByMemberName(groupId);
    var expenseRows =
        expenses.findByGroupIdOrderByExpenseDateDescIdDesc(groupId).stream()
            .filter(expense -> !expense.getReversed())
            .toList();
    var payerRows = payers.findByExpenseGroupIdAndExpenseReversedFalse(groupId);
    var shareRows = shares.findByExpenseGroupIdAndExpenseReversedFalse(groupId);
    var settlementRows =
        settlements.findByGroupIdAndReversedFalse(groupId);

    try (Workbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      Styles styles = new Styles(workbook);
      summary(workbook, styles, group, memberRows, payerRows, shareRows, settlementRows);
      expenseSheet(workbook, styles, expenseRows, payerRows);
      shareSheet(workbook, styles, expenseRows, payerRows, shareRows);
      settlementSheet(workbook, styles, settlementRows);
      memberSheet(workbook, styles, memberRows);
      workbook.write(output);
      return new ExportResult(fileName(group.getName()), output.toByteArray());
    } catch (IOException e) {
      throw new IllegalStateException("Unable to generate shared expense export", e);
    }
  }

  private void summary(
      Workbook workbook,
      Styles styles,
      SharedExpenseGroup group,
      List<SharedGroupMember> memberRows,
      List<SharedExpensePayer> payerRows,
      List<SharedExpenseShare> shareRows,
      List<SharedSettlement> settlementRows) {
    Sheet sheet = workbook.createSheet("Summary");
    cells(sheet, 0, styles.title, "Shared expense group", group.getName());
    cells(sheet, 1, styles.normal, "Status", group.getActive() ? "Active" : "Archived");
    BigDecimal total =
        payerRows.stream()
            .map(SharedExpensePayer::getExpense)
            .distinct()
            .filter(expense -> !expense.getReversed())
            .map(SharedExpense::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    Row totalRow = cells(sheet, 2, styles.normal, "Active expense total", total);
    totalRow.getCell(1).setCellStyle(styles.money);
    header(sheet, 4, styles, "Member", "Status", "Balance");

    Map<Long, BigDecimal> balances =
        memberRows.stream()
            .collect(
                Collectors.toMap(
                    SharedGroupMember::getId,
                    member -> BigDecimal.ZERO,
                    (first, second) -> first,
                    LinkedHashMap::new));
    payerRows.stream()
        .filter(row -> !row.getExpense().getReversed())
        .forEach(
            row ->
                balances.compute(
                    row.getMember().getId(),
                    (id, value) -> value.add(row.getPaidAmount())));
    shareRows.stream()
        .filter(row -> !row.getExpense().getReversed())
        .forEach(
            row ->
                balances.compute(
                    row.getMember().getId(),
                    (id, value) -> value.subtract(row.getOwedAmount())));
    settlementRows.stream()
        .filter(row -> !row.getReversed())
        .forEach(
            row -> {
              balances.compute(
                  row.getPaidBy().getId(),
                  (id, value) -> value.add(row.getAmount()));
              balances.compute(
                  row.getPaidTo().getId(),
                  (id, value) -> value.subtract(row.getAmount()));
            });

    int index = 5;
    for (SharedGroupMember member : memberRows) {
      Row row =
          cells(
              sheet,
              index++,
              styles.normal,
              member.getMemberName(),
              member.getActive() ? "Active" : "Inactive",
              balances.get(member.getId()));
      row.getCell(2).setCellStyle(styles.money);
    }
    finish(sheet, 4, 3);
  }

  private void expenseSheet(
      Workbook workbook,
      Styles styles,
      List<SharedExpense> expenseRows,
      List<SharedExpensePayer> payerRows) {
    Sheet sheet = workbook.createSheet("Expenses");
    header(
        sheet,
        0,
        styles,
        "Date",
        "Description",
        "Category",
        "Paid by",
        "Split type",
        "Amount",
        "Status");
    Map<Long, String> paidBy =
        payerRows.stream()
            .collect(
                Collectors.groupingBy(
                    row -> row.getExpense().getId(),
                    LinkedHashMap::new,
                    Collectors.mapping(
                        row ->
                            row.getMember().getMemberName()
                                + " ("
                                + row.getPaidAmount()
                                + ")",
                        Collectors.joining(", "))));
    int index = 1;
    for (SharedExpense expense : expenseRows) {
      Row row =
          cells(
              sheet,
              index++,
              styles.normal,
              expense.getExpenseDate(),
              expense.getDescription(),
              expense.getCategory(),
              paidBy.getOrDefault(expense.getId(), ""),
              expense.getSplitType(),
              expense.getTotalAmount(),
              expense.getReversed() ? "Reversed" : "Active");
      row.getCell(0).setCellStyle(styles.date);
      row.getCell(5).setCellStyle(styles.money);
    }
    finish(sheet, 0, 7);
  }

  private void shareSheet(
      Workbook workbook,
      Styles styles,
      List<SharedExpense> expenseRows,
      List<SharedExpensePayer> payerRows,
      List<SharedExpenseShare> shareRows) {
    Sheet sheet = workbook.createSheet("Expense Shares");
    header(sheet, 0, styles, "Date", "Expense", "Member", "Paid", "Owed", "Status");
    record Amounts(BigDecimal paid, BigDecimal owed) {}
    Map<String, Amounts> amounts = new LinkedHashMap<>();
    Map<Long, SharedGroupMember> memberMap = new HashMap<>();

    payerRows.forEach(
        payer -> {
          memberMap.put(payer.getMember().getId(), payer.getMember());
          String key = payer.getExpense().getId() + ":" + payer.getMember().getId();
          Amounts current = amounts.get(key);
          amounts.put(
              key,
              new Amounts(
                  (current == null ? BigDecimal.ZERO : current.paid())
                      .add(payer.getPaidAmount()),
                  current == null ? BigDecimal.ZERO : current.owed()));
        });
    shareRows.forEach(
        share -> {
          memberMap.put(share.getMember().getId(), share.getMember());
          String key = share.getExpense().getId() + ":" + share.getMember().getId();
          Amounts current = amounts.get(key);
          amounts.put(
              key,
              new Amounts(
                  current == null ? BigDecimal.ZERO : current.paid(),
                  (current == null ? BigDecimal.ZERO : current.owed())
                      .add(share.getOwedAmount())));
        });

    Map<Long, SharedExpense> expenseMap =
        expenseRows.stream()
            .collect(Collectors.toMap(SharedExpense::getId, expense -> expense));
    int index = 1;
    for (Map.Entry<String, Amounts> entry : amounts.entrySet()) {
      String[] ids = entry.getKey().split(":");
      SharedExpense expense = expenseMap.get(Long.valueOf(ids[0]));
      SharedGroupMember member = memberMap.get(Long.valueOf(ids[1]));
      Amounts amount = entry.getValue();
      Row row =
          cells(
              sheet,
              index++,
              styles.normal,
              expense.getExpenseDate(),
              expense.getDescription(),
              member.getMemberName(),
              amount.paid(),
              amount.owed(),
              expense.getReversed() ? "Reversed" : "Active");
      row.getCell(0).setCellStyle(styles.date);
      row.getCell(3).setCellStyle(styles.money);
      row.getCell(4).setCellStyle(styles.money);
    }
    finish(sheet, 0, 6);
  }

  private void settlementSheet(
      Workbook workbook, Styles styles, List<SharedSettlement> settlementRows) {
    Sheet sheet = workbook.createSheet("Settlements");
    header(
        sheet,
        0,
        styles,
        "Date",
        "Paid by",
        "Paid to",
        "Amount",
        "Payment mode",
        "Notes",
        "Status");
    int index = 1;
    for (SharedSettlement settlement : settlementRows) {
      Row row =
          cells(
              sheet,
              index++,
              styles.normal,
              settlement.getSettlementDate(),
              settlement.getPaidBy().getMemberName(),
              settlement.getPaidTo().getMemberName(),
              settlement.getAmount(),
              settlement.getPaymentMode(),
              settlement.getNotes(),
              settlement.getReversed() ? "Reversed" : "Active");
      row.getCell(0).setCellStyle(styles.date);
      row.getCell(3).setCellStyle(styles.money);
    }
    finish(sheet, 0, 7);
  }

  private void memberSheet(
      Workbook workbook, Styles styles, List<SharedGroupMember> memberRows) {
    Sheet sheet = workbook.createSheet("Members");
    header(sheet, 0, styles, "Name", "Email", "Mobile", "Status", "Registered user");
    int index = 1;
    for (SharedGroupMember member : memberRows) {
      cells(
          sheet,
          index++,
          styles.normal,
          member.getMemberName(),
          member.getEmail(),
          member.getMobile(),
          member.getActive() ? "Active" : "Inactive",
          member.getUser() == null ? "No" : "Yes");
    }
    finish(sheet, 0, 5);
  }

  private Row cells(Sheet sheet, int index, CellStyle style, Object... values) {
    Row row = sheet.createRow(index);
    for (int column = 0; column < values.length; column++) {
      Cell cell = row.createCell(column);
      Object value = values[column];
      if (value instanceof Number number) {
        cell.setCellValue(number.doubleValue());
      } else if (value instanceof LocalDate date) {
        cell.setCellValue(java.sql.Date.valueOf(date));
      } else {
        cell.setCellValue(value == null ? "" : value.toString());
      }
      cell.setCellStyle(style);
    }
    return row;
  }

  private void header(Sheet sheet, int row, Styles styles, String... values) {
    cells(sheet, row, styles.header, (Object[]) values);
  }

  private void finish(Sheet sheet, int headerRow, int columns) {
    sheet.createFreezePane(0, headerRow + 1);
    if (sheet.getLastRowNum() >= headerRow) {
      sheet.setAutoFilter(
          new CellRangeAddress(headerRow, sheet.getLastRowNum(), 0, columns - 1));
    }
    for (int column = 0; column < columns; column++) {
      sheet.autoSizeColumn(column);
      sheet.setColumnWidth(
          column, Math.min(sheet.getColumnWidth(column) + 700, 15000));
    }
  }

  private String fileName(String groupName) {
    String safe =
        groupName
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
    return (safe.isBlank() ? "shared-expense-group" : safe)
        + "-shared-expenses-"
        + LocalDate.now()
        + ".xlsx";
  }

  public record ExportResult(String fileName, byte[] content) {}

  private static class Styles {
    final CellStyle normal;
    final CellStyle header;
    final CellStyle title;
    final CellStyle money;
    final CellStyle date;

    Styles(Workbook workbook) {
      normal = workbook.createCellStyle();
      header = workbook.createCellStyle();
      Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerFont.setColor(IndexedColors.WHITE.getIndex());
      header.setFont(headerFont);
      header.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
      header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      title = workbook.createCellStyle();
      Font titleFont = workbook.createFont();
      titleFont.setBold(true);
      titleFont.setFontHeightInPoints((short) 14);
      title.setFont(titleFont);
      money = workbook.createCellStyle();
      money.setDataFormat(
          workbook.createDataFormat().getFormat("#,##0.00;[Red]-#,##0.00"));
      date = workbook.createCellStyle();
      date.setDataFormat(workbook.createDataFormat().getFormat("dd-mmm-yyyy"));
    }
  }
}