package com.app.service;

import com.app.dto.ExpenseImportDtos;
import com.app.entity.*;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.ExpenseCategoryRepository;
import com.app.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ExpenseImportService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final Pattern NEFT_REFERENCE = Pattern.compile("\\b(GSCAD[A-Z0-9]+)\\b", Pattern.CASE_INSENSITIVE);
    private static final Map<String, List<String>> CATEGORY_HINTS = Map.of(
            "electricity", List.of("ugvcl", "electric", "meter", "power", "utility"),
            "salary", List.of("salary", "supervisor", "staff"),
            "security", List.of("security", "guard"),
            "cleaning", List.of("cleaning", "housekeeping"),
            "fire", List.of("fire", "amc"),
            "water", List.of("water", "bore", "bor bill")
    );

    private final AccountRepository accountRepository;
    private final ExpenseCategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;

    public ExpenseImportDtos.Preview preview(Long accountId, MultipartFile file) {
        Account account = societyAccount(accountId);
        validateFile(file);
        List<ExpenseCategory> categories = categoryRepository.findByAccountIdAndActiveTrue(account.getId());
        DataFormatter formatter = new DataFormatter();
        FormulaEvaluator evaluator;
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) throw new ValidationException("The workbook has no sheets");
            evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            Sheet sheet = workbook.getSheetAt(0);
            Row header = firstNonEmptyRow(sheet);
            if (header == null) throw new ValidationException("The worksheet is empty");
            Map<String, Integer> columns = headers(header, formatter, evaluator);
            requireHeaders(columns, "post date", "narration", "debit amount", "credit amount");

            List<ExpenseImportDtos.Row> rows = new ArrayList<>();
            int skipped = 0;
            BigDecimal total = BigDecimal.ZERO;
            for (int i = header.getRowNum() + 1; i <= sheet.getLastRowNum(); i++) {
                Row excelRow = sheet.getRow(i);
                if (excelRow == null || isEmpty(excelRow, formatter, evaluator)) continue;
                BigDecimal debit = decimal(excelRow, columns.get("debit amount"), formatter, evaluator);
                BigDecimal credit = decimal(excelRow, columns.get("credit amount"), formatter, evaluator);
                if (debit == null || debit.signum() <= 0) {
                    if (credit != null && credit.signum() > 0) skipped++;
                    else skipped++;
                    continue;
                }
                ExpenseImportDtos.Row parsed = parseRow(excelRow, columns, categories, formatter, evaluator, accountId);
                rows.add(parsed);
                total = total.add(debit);
            }
            if (rows.isEmpty()) throw new ValidationException("No debit expense rows were found in the first worksheet");
            int ready = (int) rows.stream().filter(r -> r.getErrors().isEmpty() && !r.isDuplicate() && r.getCategoryId() != null).count();
            int warnings = (int) rows.stream().filter(r -> !r.getWarnings().isEmpty() || !r.getErrors().isEmpty()).count();
            return ExpenseImportDtos.Preview.builder()
                    .fileName(file.getOriginalFilename()).sheetName(sheet.getSheetName()).totalRows(rows.size())
                    .readyRows(ready).warningRows(warnings).skippedRows(skipped).totalDebit(total).rows(rows).build();
        } catch (IOException | RuntimeException ex) {
            if (ex instanceof ValidationException validation) throw validation;
            throw new ValidationException("Unable to read the Excel file: " + ex.getMessage());
        }
    }

    @Transactional
    public ExpenseImportDtos.Result confirm(Long accountId, Long userId, ExpenseImportDtos.ConfirmRequest request) {
        Account account = societyAccount(accountId);
        String batchId = UUID.randomUUID().toString();
        List<ExpenseImportDtos.RowResult> results = new ArrayList<>();
        BigDecimal importedAmount = BigDecimal.ZERO;
        int created = 0;
        int skipped = 0;
        Set<String> requestReferences = new HashSet<>();

        for (ExpenseImportDtos.Row row : request.getRows()) {
            validateConfirmedRow(row);
            String sourceReference = trim(row.getSourceReference());
            if (!requestReferences.add(sourceReference) || expenseRepository
                    .findByAccountIdAndSourceReferenceAndSoftDeletedFalse(accountId, sourceReference).isPresent()) {
                skipped++;
                results.add(result(row, null, "SKIPPED", "Duplicate transaction"));
                continue;
            }
            ExpenseCategory category = categoryRepository.findById(row.getCategoryId())
                    .filter(c -> c.getActive() && c.getAccount().getId().equals(accountId))
                    .orElseThrow(() -> new ValidationException("Row " + row.getRowNumber() + ": category is not available for this account"));
            Expense saved = expenseRepository.save(Expense.builder()
                    .account(account).accountType(account.getAccountType()).expenseDate(row.getExpenseDate())
                    .category(category).expenseType(ExpenseType.SOCIETY_REGULAR)
                    .vendorName(trim(row.getVendorName())).description(trim(row.getDescription()))
                    .amount(row.getAmount()).paymentMode(row.getPaymentMode())
                    .transactionId(trim(row.getTransactionId())).utr(trim(row.getUtr()))
                    .chequeNumber(trim(row.getChequeNumber()))
                    .paidBy(String.valueOf(userId)).remarks(trim(row.getRemarks()))
                    .status(row.getStatus() == null ? ExpenseStatus.PAID : row.getStatus())
                    .sourceReference(sourceReference).importBatchId(batchId).softDeleted(false).build());
            created++;
            importedAmount = importedAmount.add(saved.getAmount());
            results.add(result(row, saved.getId(), "CREATED", "Imported"));
        }
        return ExpenseImportDtos.Result.builder().importBatchId(batchId).created(created).skipped(skipped)
                .importedAmount(importedAmount).rows(results).build();
    }

    private ExpenseImportDtos.Row parseRow(Row row, Map<String, Integer> columns, List<ExpenseCategory> categories,
                                           DataFormatter formatter, FormulaEvaluator evaluator, Long accountId) {
        String srNo = text(row, columns.get("sr. no."), formatter, evaluator);
        LocalDate postDate = date(row, columns.get("post date"), formatter, evaluator);
        LocalDate valueDate = date(row, columns.get("value date"), formatter, evaluator);
        String narration = text(row, columns.get("narration"), formatter, evaluator);
        String remarks = text(row, columns.get("remarks"), formatter, evaluator);
        String tower = text(row, columns.get("tower no."), formatter, evaluator);
        String flat = text(row, columns.get("flat no."), formatter, evaluator);
        String cheque = zeroToNull(text(row, columns.get("cheque number"), formatter, evaluator));
        BigDecimal amount = decimal(row, columns.get("debit amount"), formatter, evaluator);
        String transactionId = match(NEFT_REFERENCE, narration);
        PaymentMode paymentMode = narration.toUpperCase(Locale.ROOT).startsWith("NEFT") ? PaymentMode.NEFT :
                (cheque != null ? PaymentMode.CHEQUE : PaymentMode.BANK);
        String combinedRemarks = joinRemarks(remarks, tower, flat);
        ExpenseCategory category = suggestCategory(categories, narration + " " + combinedRemarks);
        String sourceReference = transactionId != null ? "BANK:" + transactionId.toUpperCase(Locale.ROOT) :
                "BANK:" + srNo + ":" + (postDate != null ? postDate : valueDate) + ":" + amount;
        boolean duplicate = expenseRepository.findByAccountIdAndSourceReferenceAndSoftDeletedFalse(accountId, sourceReference).isPresent();
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (postDate == null && valueDate == null) errors.add("Post Date and Value Date are missing or invalid");
        if (narration.isBlank()) warnings.add("Narration is empty");
        if (category == null) warnings.add("Select a category before importing");
        if (duplicate) warnings.add("This transaction was already imported");
        return ExpenseImportDtos.Row.builder().rowNumber(row.getRowNum() + 1).sourceReference(sourceReference)
                .expenseDate(postDate != null ? postDate : valueDate).valueDate(valueDate).description(narration)
                .vendorName(vendor(narration)).amount(amount).paymentMode(paymentMode).transactionId(transactionId)
                .utr(transactionId)
                .chequeNumber(cheque).remarks(combinedRemarks).categoryId(category != null ? category.getId() : null)
                .categoryName(category != null ? category.getCategoryName() : null).status(ExpenseStatus.PAID)
                .duplicate(duplicate).warnings(warnings).errors(errors).build();
    }

    private ExpenseCategory suggestCategory(List<ExpenseCategory> categories, String content) {
        String normalized = content.toLowerCase(Locale.ROOT);
        ExpenseCategory best = null;
        int bestScore = 0;
        for (ExpenseCategory category : categories) {
            String name = category.getCategoryName().toLowerCase(Locale.ROOT);
            int score = normalized.contains(name) ? 10 : 0;
            for (Map.Entry<String, List<String>> hint : CATEGORY_HINTS.entrySet()) {
                boolean contentMatch = hint.getValue().stream().anyMatch(normalized::contains);
                boolean categoryMatch = name.contains(hint.getKey()) || hint.getValue().stream().anyMatch(name::contains);
                if (contentMatch && categoryMatch) score += 5;
            }
            if (score > bestScore) { best = category; bestScore = score; }
        }
        return bestScore > 0 ? best : null;
    }

    private String vendor(String narration) {
        if (narration == null) return null;
        Matcher reference = NEFT_REFERENCE.matcher(narration);
        if (narration.toUpperCase(Locale.ROOT).startsWith("NEFT ") && reference.find())
            return narration.substring(5, reference.start()).trim();
        return null;
    }

    private Account societyAccount(Long accountId) {
        Account account = accountRepository.findById(accountId).orElseThrow(() -> new ValidationException("Account not found"));
        if (account.getAccountType() != AccountType.SOCIETY) throw new ValidationException("Excel expense import is available only for society accounts");
        return account;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ValidationException("Select an Excel file to import");
        if (file.getSize() > MAX_FILE_SIZE) throw new ValidationException("Excel file must be 10 MB or smaller");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) throw new ValidationException("Only .xlsx and .xls files are supported");
    }

    private void validateConfirmedRow(ExpenseImportDtos.Row row) {
        String prefix = "Row " + row.getRowNumber() + ": ";
        if (row.getExpenseDate() == null) throw new ValidationException(prefix + "expense date is required");
        if (row.getAmount() == null || row.getAmount().signum() <= 0) throw new ValidationException(prefix + "amount must be greater than zero");
        if (row.getCategoryId() == null) throw new ValidationException(prefix + "category is required");
        if (row.getPaymentMode() == null) throw new ValidationException(prefix + "payment mode is required");
        if (trim(row.getSourceReference()) == null) throw new ValidationException(prefix + "source reference is required");
    }

    private Row firstNonEmptyRow(Sheet sheet) {
        for (Row row : sheet) if (row != null && row.getPhysicalNumberOfCells() > 0) return row;
        return null;
    }
    private Map<String, Integer> headers(Row row, DataFormatter f, FormulaEvaluator e) {
        Map<String, Integer> result = new HashMap<>();
        for (Cell cell : row) result.put(f.formatCellValue(cell, e).trim().toLowerCase(Locale.ROOT), cell.getColumnIndex());
        return result;
    }
    private void requireHeaders(Map<String, Integer> headers, String... required) {
        List<String> missing = Arrays.stream(required).filter(h -> !headers.containsKey(h)).toList();
        if (!missing.isEmpty()) throw new ValidationException("Missing required column(s): " + String.join(", ", missing));
    }
    private boolean isEmpty(Row row, DataFormatter f, FormulaEvaluator e) {
        for (Cell cell : row) if (!f.formatCellValue(cell, e).trim().isEmpty()) return false;
        return true;
    }
    private String text(Row row, Integer column, DataFormatter f, FormulaEvaluator e) {
        if (column == null) return "";
        Cell cell = row.getCell(column, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        return cell == null ? "" : f.formatCellValue(cell, e).trim();
    }
    private BigDecimal decimal(Row row, Integer column, DataFormatter f, FormulaEvaluator e) {
        if (column == null) return null;
        Cell cell = row.getCell(column, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) return BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros();
            String raw = f.formatCellValue(cell, e).replace(",", "").trim();
            return raw.isEmpty() ? null : new BigDecimal(raw);
        } catch (NumberFormatException ex) { return null; }
    }
    private LocalDate date(Row row, Integer column, DataFormatter f, FormulaEvaluator e) {
        if (column == null) return null;
        Cell cell = row.getCell(column, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) return cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            return LocalDate.parse(f.formatCellValue(cell, e).trim());
        } catch (RuntimeException ex) { return null; }
    }
    private String match(Pattern pattern, String value) { Matcher m = pattern.matcher(value == null ? "" : value); return m.find() ? m.group(1) : null; }
    private String zeroToNull(String value) { return value == null || value.isBlank() || value.matches("0+(\\.0+)?") ? null : value; }
    private String joinRemarks(String remarks, String tower, String flat) {
        List<String> values = new ArrayList<>();
        if (remarks != null && !remarks.isBlank()) values.add(remarks);
        if (tower != null && !tower.isBlank()) values.add("Tower: " + tower);
        if (flat != null && !flat.isBlank()) values.add("Flat: " + flat);
        return String.join(" | ", values);
    }
    private String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private ExpenseImportDtos.RowResult result(ExpenseImportDtos.Row row, Long id, String status, String message) {
        return ExpenseImportDtos.RowResult.builder().rowNumber(row.getRowNumber()).sourceReference(row.getSourceReference())
                .expenseId(id).status(status).message(message).build();
    }
}
