package com.app.service;

import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.*;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SharedExpensePdfExportService {
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
    List<SharedGroupMember> memberRows =
        members.findByGroupIdOrderByMemberName(groupId);
    List<SharedExpense> expenseRows =
        expenses.findByGroupIdOrderByExpenseDateDescIdDesc(groupId).stream()
            .filter(expense -> !expense.getReversed())
            .toList();
    List<SharedExpensePayer> payerRows =
        payers.findByExpenseGroupIdAndExpenseReversedFalse(groupId);
    List<SharedExpenseShare> shareRows =
        shares.findByExpenseGroupIdAndExpenseReversedFalse(groupId);
    List<SharedSettlement> settlementRows =
        settlements.findByGroupIdAndReversedFalse(groupId);

    ByteArrayOutputStream output = new ByteArrayOutputStream();
    PdfDocument pdf = new PdfDocument(new PdfWriter(output));
    try (Document document = new Document(pdf, PageSize.A4.rotate())) {
      document.setMargins(28, 28, 28, 28);
      document.add(
          new Paragraph(group.getName())
              .setBold()
              .setFontSize(18)
              .setFontColor(ColorConstants.DARK_GRAY));
      document.add(
          new Paragraph(
                  "Shared expense report • "
                      + (group.getActive() ? "Active" : "Archived")
                      + " • Exported "
                      + LocalDate.now())
              .setFontSize(9)
              .setFontColor(ColorConstants.GRAY));

      Map<Long, BigDecimal> balances =
          balances(memberRows, payerRows, shareRows, settlementRows);
      BigDecimal total =
          expenseRows.stream()
              .map(SharedExpense::getTotalAmount)
              .reduce(BigDecimal.ZERO, BigDecimal::add);
      document.add(new Paragraph("Summary").setBold().setFontSize(13));
      Table summary = table("Metric", "Value");
      addRow(summary, "Active expense total", money(total));
      addRow(summary, "Members", String.valueOf(memberRows.size()));
      addRow(summary, "Expenses", String.valueOf(expenseRows.size()));
      addRow(summary, "Settlements", String.valueOf(settlementRows.size()));
      document.add(summary);

      document.add(new Paragraph("Member balances").setBold().setFontSize(13));
      Table balanceTable = table("Member", "Status", "Balance");
      for (SharedGroupMember member : memberRows) {
        addRow(
            balanceTable,
            member.getMemberName(),
            member.getActive() ? "Active" : "Inactive",
            money(balances.get(member.getId())));
      }
      document.add(balanceTable);

      document.add(new Paragraph("Paid by member").setBold().setFontSize(13));
      Table paidByMemberTable = table("Member", "Total paid");
      Map<Long, BigDecimal> paidTotals = payerRows.stream().collect(Collectors.groupingBy(
          row -> row.getMember().getId(),
          Collectors.reducing(BigDecimal.ZERO, SharedExpensePayer::getPaidAmount, BigDecimal::add)));
      for (SharedGroupMember member : memberRows) {
        addRow(paidByMemberTable, member.getMemberName(), money(paidTotals.getOrDefault(member.getId(), BigDecimal.ZERO)));
      }
      document.add(paidByMemberTable);

      record CategoryTotal(long count, BigDecimal amount) {}
      Map<String, CategoryTotal> categoryTotals = new LinkedHashMap<>();
      expenseRows.forEach(expense -> {
        String category = expense.getCategory() == null || expense.getCategory().isBlank()
            ? "Uncategorized" : expense.getCategory();
        CategoryTotal current = categoryTotals.get(category);
        categoryTotals.put(category, new CategoryTotal(
            current == null ? 1 : current.count() + 1,
            (current == null ? BigDecimal.ZERO : current.amount()).add(expense.getTotalAmount())));
      });
      document.add(new Paragraph("Spending by category").setBold().setFontSize(13));
      Table categoryTable = table("Category", "Expense count", "Total amount");
      categoryTotals.entrySet().stream()
          .sorted(Map.Entry.<String, CategoryTotal>comparingByValue(
              Comparator.comparing(CategoryTotal::amount)).reversed())
          .forEach(entry -> addRow(categoryTable, entry.getKey(), String.valueOf(entry.getValue().count()), money(entry.getValue().amount())));
      emptyRow(categoryTable, categoryTotals.isEmpty(), 3, "No category expenses");
      document.add(categoryTable);

      document.add(new Paragraph("Expenses").setBold().setFontSize(13));
      Table expenseTable =
          table("Date", "Description", "Category", "Paid by", "Split", "Amount");
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
                                  + money(row.getPaidAmount())
                                  + ")",
                          Collectors.joining(", "))));
      for (SharedExpense expense : expenseRows) {
        addRow(
            expenseTable,
            expense.getExpenseDate().toString(),
            expense.getDescription(),
            value(expense.getCategory()),
            paidBy.getOrDefault(expense.getId(), ""),
            expense.getSplitType().name(),
            money(expense.getTotalAmount()));
      }
      emptyRow(expenseTable, expenseRows.isEmpty(), 6, "No expenses");
      document.add(expenseTable);

      document.add(new Paragraph("Expense shares").setBold().setFontSize(13));
      Table shareTable = table("Date", "Expense", "Member", "Paid", "Owed");
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
      for (Map.Entry<String, Amounts> entry : amounts.entrySet()) {
        String[] ids = entry.getKey().split(":");
        SharedExpense expense = expenseMap.get(Long.valueOf(ids[0]));
        SharedGroupMember member = memberMap.get(Long.valueOf(ids[1]));
        addRow(
            shareTable,
            expense.getExpenseDate().toString(),
            expense.getDescription(),
            member.getMemberName(),
            money(entry.getValue().paid()),
            money(entry.getValue().owed()));
      }
      emptyRow(shareTable, amounts.isEmpty(), 5, "No expense shares");
      document.add(shareTable);

      document.add(new Paragraph("Settlements").setBold().setFontSize(13));
      Table settlementTable =
          table("Date", "Paid by", "Paid to", "Amount", "Mode", "Notes");
      for (SharedSettlement settlement : settlementRows) {
        addRow(
            settlementTable,
            settlement.getSettlementDate().toString(),
            settlement.getPaidBy().getMemberName(),
            settlement.getPaidTo().getMemberName(),
            money(settlement.getAmount()),
            value(settlement.getPaymentMode()),
            value(settlement.getNotes()));
      }
      emptyRow(settlementTable, settlementRows.isEmpty(), 6, "No settlements");
      document.add(settlementTable);

      document.add(new Paragraph("Members").setBold().setFontSize(13));
      Table memberTable =
          table("Name", "Email", "Mobile", "Status", "Registered user");
      for (SharedGroupMember member : memberRows) {
        addRow(
            memberTable,
            member.getMemberName(),
            value(member.getEmail()),
            value(member.getMobile()),
            member.getActive() ? "Active" : "Inactive",
            member.getUser() == null ? "No" : "Yes");
      }
      document.add(memberTable);
    }
    return new ExportResult(fileName(group.getName()), output.toByteArray());
  }

  private Map<Long, BigDecimal> balances(
      List<SharedGroupMember> memberRows,
      List<SharedExpensePayer> payerRows,
      List<SharedExpenseShare> shareRows,
      List<SharedSettlement> settlementRows) {
    Map<Long, BigDecimal> result =
        memberRows.stream()
            .collect(
                Collectors.toMap(
                    SharedGroupMember::getId,
                    member -> BigDecimal.ZERO,
                    (first, second) -> first,
                    LinkedHashMap::new));
    payerRows.forEach(
        row ->
            result.compute(
                row.getMember().getId(),
                (id, amount) -> amount.add(row.getPaidAmount())));
    shareRows.forEach(
        row ->
            result.compute(
                row.getMember().getId(),
                (id, amount) -> amount.subtract(row.getOwedAmount())));
    settlementRows.forEach(
        row -> {
          result.compute(
              row.getPaidBy().getId(),
              (id, amount) -> amount.add(row.getAmount()));
          result.compute(
              row.getPaidTo().getId(),
              (id, amount) -> amount.subtract(row.getAmount()));
        });
    return result;
  }

  private Table table(String... headers) {
    Table table =
        new Table(UnitValue.createPercentArray(headers.length))
            .useAllAvailableWidth()
            .setFontSize(8)
            .setMarginBottom(12);
    for (String header : headers) {
      table.addHeaderCell(
          new Cell()
              .add(new Paragraph(header).setBold())
              .setBackgroundColor(ColorConstants.LIGHT_GRAY));
    }
    return table;
  }

  private void addRow(Table table, String... values) {
    for (String value : values) {
      table.addCell(new Cell().add(new Paragraph(value(value))));
    }
  }

  private void emptyRow(Table table, boolean empty, int columns, String message) {
    if (empty) {
      table.addCell(
          new Cell(1, columns)
              .add(new Paragraph(message))
              .setTextAlignment(TextAlignment.CENTER)
              .setFontColor(ColorConstants.GRAY));
    }
  }

  private String value(String value) {
    return value == null || value.isBlank() ? "-" : value;
  }

  private String money(BigDecimal amount) {
    return amount == null ? "0.00" : amount.setScale(2).toPlainString();
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
        + ".pdf";
  }

  public record ExportResult(String fileName, byte[] content) {}
}
