package com.app.service;

import com.app.dto.SocietyJournalDtos;
import com.app.entity.*;
import com.app.exception.ValidationException;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class SocietyJournalService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final FlatRepository flatRepository;
    private final SocietyJournalEntryRepository journalRepository;

    public SocietyJournalDtos.Preview preview(Long accountId, String year, MultipartFile file) {
        societyAccount(accountId); validateYear(year); validateFile(file);
        List<Flat> flats = flatRepository.findByAccountIdAndActiveTrue(accountId);
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) throw new ValidationException("The workbook has no sheets");
            Sheet sheet = workbook.getSheetAt(0); FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            Row header = findHeader(sheet, formatter, evaluator); Map<String,Integer> columns = headers(header, formatter, evaluator);
            requireHeaders(columns, "date", "particulars", "reference", "voucher type", "voucher number", "debit", "credit");
            List<SocietyJournalDtos.Voucher> vouchers = new ArrayList<>(); Draft draft = null;
            for (int index = header.getRowNum() + 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index); if (row == null || empty(row, formatter, evaluator)) continue;
                String serial = text(row, columns.get("number"), formatter, evaluator);
                String voucherNumber = text(row, columns.get("voucher number"), formatter, evaluator);
                boolean startsVoucher = !serial.isBlank() || !voucherNumber.isBlank();
                if (startsVoucher) {
                    if (draft != null) vouchers.add(finish(draft, accountId, year));
                    draft = new Draft();
                    draft.date = date(row, columns.get("date"), formatter, evaluator);
                    draft.reference = text(row, columns.get("reference"), formatter, evaluator);
                    draft.voucherType = text(row, columns.get("voucher type"), formatter, evaluator);
                    draft.voucherNumber = voucherNumber;
                }
                if (draft == null) continue;
                String particulars = text(row, columns.get("particulars"), formatter, evaluator);
                String ledgerName = text(row, columns.get("ledger name"), formatter, evaluator);
                String flatText = text(row, columns.get("flat"), formatter, evaluator);
                BigDecimal debit = amount(row, columns.get("debit"), formatter, evaluator);
                BigDecimal credit = amount(row, columns.get("credit"), formatter, evaluator);
                if ((debit.signum() > 0 || credit.signum() > 0) && (!ledgerName.isBlank() || !particulars.isBlank())) {
                    String ledger;
                    String narration;
                    if (!ledgerName.isBlank()) {
                        ledger = ledgerName;
                        narration = particulars;
                    } else {
                        String[] parts = particulars.split("\\R", 2);
                        ledger = parts[0].trim();
                        narration = parts.length > 1 ? parts[1].trim() : "";
                    }
                    if ((draft.narration == null || draft.narration.isBlank()) && !narration.isBlank()) draft.narration = narration;
                    boolean unitLine = requiresUnit(draft.voucherType, debit, credit);
                    Flat flat = unitLine ? matchFlat(flatText, flats) : null;
                    if (flat == null && unitLine) flat = matchFlat(ledger, flats);
                    List<String> errors = new ArrayList<>();
                    if (unitLine && flat == null) errors.add("Select the member or unit for this " + (credit.signum() > 0 ? "credit" : "debit") + " line");
                    draft.lines.add(SocietyJournalDtos.Line.builder().lineNumber(draft.lines.size() + 1).ledgerName(ledger)
                            .particulars(narration).flatId(flat == null ? null : flat.getId()).flatLabel(flat == null ? null : label(flat))
                            .debit(debit).credit(credit).errors(errors).build());
                }
            }
            if (draft != null) vouchers.add(finish(draft, accountId, year));
            int duplicates = (int) vouchers.stream().filter(SocietyJournalDtos.Voucher::isDuplicate).count();
            int ready = (int) vouchers.stream().filter(this::ready).count();
            return SocietyJournalDtos.Preview.builder().fileName(file.getOriginalFilename()).sheetName(sheet.getSheetName()).financialYear(year)
                    .totalVouchers(vouchers.size()).readyVouchers(ready).duplicateVouchers(duplicates)
                    .reviewVouchers(vouchers.size() - ready - duplicates).vouchers(vouchers).build();
        } catch (Exception exception) {
            if (exception instanceof ValidationException validation) throw validation;
            throw new ValidationException("Unable to read journal book: " + exception.getMessage());
        }
    }

    @Transactional
    public SocietyJournalDtos.ImportResult confirm(Long accountId, Long userId, SocietyJournalDtos.ImportRequest request) {
        Account account = societyAccount(accountId); validateYear(request.getFinancialYear());
        User user = userRepository.findById(userId).orElseThrow(() -> new ValidationException("User not found"));
        int created = 0, relinked = 0, skipped = 0; Set<String> submitted = new HashSet<>();
        for (SocietyJournalDtos.Voucher voucher : request.getVouchers()) {
            validateVoucher(voucher, accountId, request.getFinancialYear());
            String key = voucher.getVoucherNumber().trim().toLowerCase(Locale.ROOT);
            if (!submitted.add(key)) { skipped++; continue; }
            Optional<SocietyJournalEntry> existing = journalRepository.findByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(
                    accountId, request.getFinancialYear(), voucher.getVoucherNumber());
            if (existing.isPresent()) {
                if (relinkExistingVoucher(existing.get(), voucher, accountId)) relinked++;
                else skipped++;
                continue;
            }
            SocietyJournalEntry entry = SocietyJournalEntry.builder().account(account).financialYear(request.getFinancialYear()).entryDate(voucher.getDate())
                    .referenceNumber(clean(voucher.getReferenceNumber())).voucherType(voucher.getVoucherType().trim()).voucherNumber(voucher.getVoucherNumber().trim())
                    .narration(clean(voucher.getNarration())).createdBy(user).build();
            for (SocietyJournalDtos.Line line : voucher.getLines()) {
                Flat flat = line.getFlatId() == null ? null : flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, line.getFlatId())
                        .orElseThrow(() -> new ValidationException("Flat or unit is not available for " + line.getLedgerName()));
                SocietyJournalLine savedLine = SocietyJournalLine.builder().journalEntry(entry).flat(flat).lineNumber(line.getLineNumber())
                        .ledgerName(line.getLedgerName().trim()).particulars(clean(line.getParticulars())).debit(value(line.getDebit())).credit(value(line.getCredit())).build();
                entry.getLines().add(savedLine);
            }
            journalRepository.save(entry); created++;
        }
        return SocietyJournalDtos.ImportResult.builder().created(created).relinked(relinked).skipped(skipped).build();
    }

    private boolean relinkExistingVoucher(SocietyJournalEntry existing, SocietyJournalDtos.Voucher submitted, Long accountId) {
        boolean changed = false;
        for (SocietyJournalDtos.Line submittedLine : submitted.getLines()) {
            if (submittedLine.getFlatId() == null) continue;
            Flat flat = flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, submittedLine.getFlatId())
                    .orElseThrow(() -> new ValidationException("Selected member or unit is no longer active"));
            Optional<SocietyJournalLine> storedLine = existing.getLines().stream()
                    .filter(line -> Objects.equals(line.getLineNumber(), submittedLine.getLineNumber()))
                    .filter(line -> value(line.getDebit()).compareTo(value(submittedLine.getDebit())) == 0)
                    .filter(line -> value(line.getCredit()).compareTo(value(submittedLine.getCredit())) == 0)
                    .findFirst();
            if (storedLine.isPresent() && storedLine.get().getFlat() == null) {
                storedLine.get().setFlat(flat);
                changed = true;
            }
        }
        if (changed) journalRepository.save(existing);
        return changed;
    }

    @Transactional(readOnly = true)
    public SocietyJournalDtos.PageResult list(Long accountId, String year, String search, int page, int size) {
        societyAccount(accountId); validateYear(year);
        Page<SocietyJournalEntry> result = journalRepository.search(accountId, year, Optional.ofNullable(search).orElse("").trim(), PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100)));
        return SocietyJournalDtos.PageResult.builder().content(result.getContent().stream().map(this::dto).toList()).totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages()).number(result.getNumber()).build();
    }

    private SocietyJournalDtos.Voucher finish(Draft draft, Long accountId, String year) {
        BigDecimal debit = draft.lines.stream().map(SocietyJournalDtos.Line::getDebit).map(this::value).reduce(ZERO, BigDecimal::add);
        BigDecimal credit = draft.lines.stream().map(SocietyJournalDtos.Line::getCredit).map(this::value).reduce(ZERO, BigDecimal::add);
        List<String> errors = new ArrayList<>();
        if (draft.date == null) errors.add("Date is missing or invalid"); else if (!inYear(draft.date, year)) errors.add("Date is outside " + year);
        if (blank(draft.voucherType)) errors.add("Voucher type is required"); if (blank(draft.voucherNumber)) errors.add("Voucher number is required");
        if (draft.lines.size() < 2) errors.add("At least two journal lines are required");
        boolean balanced = debit.signum() > 0 && debit.compareTo(credit) == 0;
        if (!balanced) errors.add("Voucher is not balanced");
        boolean duplicate = !blank(draft.voucherNumber) && journalRepository.existsByAccountIdAndFinancialYearAndVoucherNumberIgnoreCase(accountId, year, draft.voucherNumber);
        return SocietyJournalDtos.Voucher.builder().date(draft.date).referenceNumber(draft.reference).voucherType(draft.voucherType).voucherNumber(draft.voucherNumber)
                .narration(draft.narration).totalDebit(debit).totalCredit(credit).balanced(balanced).duplicate(duplicate).lines(draft.lines).errors(errors).build();
    }

    private void validateVoucher(SocietyJournalDtos.Voucher voucher, Long accountId, String year) {
        if (voucher == null || voucher.getDate() == null || !inYear(voucher.getDate(), year) || blank(voucher.getVoucherNumber()) || blank(voucher.getVoucherType()) || voucher.getLines() == null || voucher.getLines().size() < 2)
            throw new ValidationException("Journal voucher is incomplete");
        BigDecimal debit = ZERO, credit = ZERO;
        for (SocietyJournalDtos.Line line : voucher.getLines()) {
            BigDecimal dr = value(line.getDebit()), cr = value(line.getCredit());
            if (blank(line.getLedgerName()) || dr.signum() < 0 || cr.signum() < 0 || (dr.signum() > 0 && cr.signum() > 0) || (dr.signum() == 0 && cr.signum() == 0)) throw new ValidationException("Every journal line must contain one debit or credit amount");
            if (requiresUnit(voucher.getVoucherType(), dr, cr) && line.getFlatId() == null) throw new ValidationException("Select a member or unit for " + (cr.signum() > 0 ? "credit" : "debit") + " ledger " + line.getLedgerName());
            debit = debit.add(dr); credit = credit.add(cr);
        }
        if (debit.signum() <= 0 || debit.compareTo(credit) != 0) throw new ValidationException("Journal voucher " + voucher.getVoucherNumber() + " is not balanced");
    }

    private SocietyJournalDtos.Voucher dto(SocietyJournalEntry entry) {
        List<SocietyJournalDtos.Line> lines = entry.getLines().stream().map(line -> SocietyJournalDtos.Line.builder().lineNumber(line.getLineNumber()).ledgerName(line.getLedgerName())
                .particulars(line.getParticulars()).flatId(line.getFlat() == null ? null : line.getFlat().getId()).flatLabel(line.getFlat() == null ? null : label(line.getFlat()))
                .debit(line.getDebit()).credit(line.getCredit()).build()).toList();
        BigDecimal debit = lines.stream().map(SocietyJournalDtos.Line::getDebit).reduce(ZERO, BigDecimal::add);
        BigDecimal credit = lines.stream().map(SocietyJournalDtos.Line::getCredit).reduce(ZERO, BigDecimal::add);
        return SocietyJournalDtos.Voucher.builder().date(entry.getEntryDate()).referenceNumber(entry.getReferenceNumber()).voucherType(entry.getVoucherType())
                .voucherNumber(entry.getVoucherNumber()).narration(entry.getNarration()).totalDebit(debit).totalCredit(credit).balanced(debit.compareTo(credit)==0).lines(lines).build();
    }

    private boolean ready(SocietyJournalDtos.Voucher voucher) { return !voucher.isDuplicate() && voucher.getErrors().isEmpty() && voucher.getLines().stream().allMatch(line -> line.getErrors().isEmpty()); }
    private boolean requiresUnit(String voucherType, BigDecimal debit, BigDecimal credit) {
        String type = normalize(voucherType);
        if (type.equals("creditnote")) return value(credit).signum() > 0;
        return (type.equals("invoice") || type.equals("debitnote")) && value(debit).signum() > 0;
    }
    private Flat matchFlat(String ledger, List<Flat> flats) {
        String target = normalize(ledger);
        if (target.isBlank()) return null;
        List<Flat> matches = flats.stream().filter(flat ->
                target.equals(normalize(label(flat)))
                        || target.equals(normalize(flat.getFlatNumber()))
                        || target.equals(normalize(flat.getOwnerName())))
                .toList();
        return matches.size() == 1 ? matches.get(0) : null;
    }
    private String label(Flat flat) { return flat.getBlockName() + "-" + flat.getFlatNumber(); }
    private String normalize(String value) { return Optional.ofNullable(value).orElse("").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", ""); }
    private BigDecimal value(BigDecimal amount) { return amount == null ? ZERO : amount; }
    private String clean(String value) { return blank(value) ? null : value.trim(); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private void validateYear(String year) { if (year == null || !year.matches("\\d{4}-\\d{4}")) throw new ValidationException("Financial year must look like 2026-2027"); }
    private boolean inYear(LocalDate date, String year) { int start = Integer.parseInt(year.substring(0,4)); return !date.isBefore(LocalDate.of(start,4,1)) && !date.isAfter(LocalDate.of(start+1,3,31)); }
    private Account societyAccount(Long id) { Account account = accountRepository.findById(id).orElseThrow(() -> new ValidationException("Account not found")); if (account.getAccountType()!=AccountType.SOCIETY) throw new ValidationException("Journal book is available only for society accounts"); return account; }
    private void validateFile(MultipartFile file) { if(file==null||file.isEmpty()) throw new ValidationException("Select an Excel journal book"); if(file.getSize()>MAX_FILE_SIZE) throw new ValidationException("Excel file must be 10 MB or smaller"); String name=Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(); if(!name.endsWith(".xlsx")&&!name.endsWith(".xls")) throw new ValidationException("Only .xlsx and .xls files are supported"); }
    private Row findHeader(Sheet sheet, DataFormatter f, FormulaEvaluator e) { for(Row row:sheet){Map<String,Integer> h=headers(row,f,e); if(h.containsKey("date")&&h.containsKey("particulars")&&h.containsKey("debit"))return row;} throw new ValidationException("Could not find journal columns: Date, Particulars, Reference No., Voucher Type, Voucher No., Debit and Credit"); }
    private Map<String,Integer> headers(Row row, DataFormatter f, FormulaEvaluator e) { Map<String,Integer> result=new HashMap<>(); for(Cell cell:row){String raw=f.formatCellValue(cell,e);String key=normalize(raw);String canonical=switch(key){case "","serialno","srno","no"->"number";case "towerflat","towerunit","flatunit","flat","unit"->"flat";case "date"->"date";case "ledger","ledgername"->"ledger name";case "particular","particulars"->"particulars";case "referenceno","referencenumber","reference"->"reference";case "vouchertype"->"voucher type";case "voucherno","vouchernumber","vouchernovouchertype"->"voucher number";case "debit"->"debit";case "credit"->"credit";default->raw.trim().toLowerCase();};result.put(canonical,cell.getColumnIndex());} return result; }
    private void requireHeaders(Map<String,Integer> headers,String... required){List<String> missing=Arrays.stream(required).filter(key->!headers.containsKey(key)).toList();if(!missing.isEmpty())throw new ValidationException("Missing journal column(s): "+String.join(", ",missing));}
    private String text(Row row,Integer column,DataFormatter f,FormulaEvaluator e){if(column==null)return "";Cell cell=row.getCell(column,Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);return cell==null?"":f.formatCellValue(cell,e).trim();}
    private BigDecimal amount(Row row,Integer column,DataFormatter f,FormulaEvaluator e){String raw=text(row,column,f,e).replace(",","").trim();if(raw.isBlank())return ZERO;try{return new BigDecimal(raw);}catch(Exception ignored){return ZERO;}}
    private LocalDate date(Row row,Integer column,DataFormatter f,FormulaEvaluator e){if(column==null)return null;Cell cell=row.getCell(column,Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);if(cell==null)return null;try{if(cell.getCellType()==CellType.NUMERIC)return cell.getLocalDateTimeCellValue().toLocalDate();String raw=f.formatCellValue(cell,e).trim();for(DateTimeFormatter format:List.of(DateTimeFormatter.ofPattern("dd-MMM-uuuu",Locale.ENGLISH),DateTimeFormatter.ofPattern("dd-MMM-yy",Locale.ENGLISH),DateTimeFormatter.ISO_LOCAL_DATE,DateTimeFormatter.ofPattern("dd/MM/uuuu"))){try{return LocalDate.parse(raw,format);}catch(Exception ignored){}}}catch(Exception ignored){}return null;}
    private boolean empty(Row row,DataFormatter f,FormulaEvaluator e){for(Cell cell:row)if(!f.formatCellValue(cell,e).trim().isEmpty())return false;return true;}
    private static class Draft { LocalDate date; String reference; String voucherType; String voucherNumber; String narration; List<SocietyJournalDtos.Line> lines=new ArrayList<>(); }
}
