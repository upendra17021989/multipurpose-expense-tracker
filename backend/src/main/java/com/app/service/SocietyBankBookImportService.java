package com.app.service;

import com.app.dto.SocietyBankBookImportDtos;
import com.app.entity.*;
import com.app.exception.ValidationException;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class SocietyBankBookImportService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final DateTimeFormatter TEXT_DATE = new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-uuuu").toFormatter(Locale.ENGLISH);
    private final AccountRepository accountRepository; private final UserRepository userRepository; private final FlatRepository flatRepository;
    private final SocietyAnnualCollectionRepository collectionRepository; private final SocietyBankBookImportRepository importRepository;
    private final SocietyBankBookTransactionRepository transactionRepository;

    public SocietyBankBookImportDtos.Preview preview(Long accountId, String financialYear, MultipartFile file) {
        societyAccount(accountId); validateFile(file); validateYear(financialYear);
        List<Flat> flats = flatRepository.findByAccountIdAndActiveTrue(accountId);
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) throw new ValidationException("The workbook has no sheets");
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator(); Sheet sheet = workbook.getSheetAt(0);
            Row header = findHeader(sheet, formatter, evaluator); Map<String,Integer> columns = headers(header, formatter, evaluator);
            requireHeaders(columns, "date", "type", "flat no.", "particulars", "reference number", "voucher number", "debit", "credit", "balance");
            List<SocietyBankBookImportDtos.Row> rows = new ArrayList<>(); int skipped = 0; BigDecimal total = BigDecimal.ZERO;
            for (int i=header.getRowNum()+1;i<=sheet.getLastRowNum();i++) {
                Row excel = sheet.getRow(i); if (excel==null || isEmpty(excel, formatter, evaluator)) continue;
                String type=text(excel,columns.get("type"),formatter,evaluator); String particulars=text(excel,columns.get("particulars"),formatter,evaluator);
                String normalizedType=normalize(type);
                boolean bankReceipt=normalizedType.contains("bankreciept")||normalizedType.contains("bankreceipt");
                boolean cashReceipt=normalizedType.contains("cashreciept")||normalizedType.contains("cashreceipt");
                if (type.isBlank() || particulars.toLowerCase(Locale.ROOT).contains("opening balance") || !bankReceipt && !cashReceipt) { skipped++; continue; }
                BigDecimal debit=decimal(excel,columns.get("debit"),formatter,evaluator); if(debit==null||debit.signum()<=0){skipped++;continue;}
                SocietyBankBookImportDtos.Row parsed=parse(excel,columns,formatter,evaluator,flats,accountId,financialYear); rows.add(parsed); total=total.add(debit);
            }
            int duplicates=(int)rows.stream().filter(SocietyBankBookImportDtos.Row::isDuplicate).count();
            int unmatched=(int)rows.stream().filter(row->row.getFlatId()==null).count();
            int ready=(int)rows.stream().filter(row->!row.isDuplicate()&&row.getFlatId()!=null&&row.getErrors().isEmpty()).count();
            return SocietyBankBookImportDtos.Preview.builder().fileName(file.getOriginalFilename()).sheetName(sheet.getSheetName()).financialYear(financialYear)
                    .totalRows(rows.size()).readyRows(ready).duplicateRows(duplicates).unmatchedRows(unmatched).skippedRows(skipped).totalAmount(total).rows(rows).build();
        } catch (Exception ex) { if(ex instanceof ValidationException validation)throw validation; throw new ValidationException("Unable to read cash / bank book: "+ex.getMessage()); }
    }

    @Transactional
    public SocietyBankBookImportDtos.Result confirm(Long accountId, Long userId, SocietyBankBookImportDtos.ConfirmRequest request) {
        Account account=societyAccount(accountId); validateYear(request.getFinancialYear());
        User user=userRepository.findById(userId).orElseThrow(()->new ValidationException("User not found")); String batchId=UUID.randomUUID().toString();
        SocietyBankBookImport bankImport=SocietyBankBookImport.builder().account(account).importedBy(user).batchId(batchId).fileName(request.getFileName())
                .financialYear(request.getFinancialYear()).totalRows(request.getRows().size()).createdRows(0).skippedRows(0).importedAmount(BigDecimal.ZERO).build();
        importRepository.save(bankImport); int created=0,skipped=0; BigDecimal amount=BigDecimal.ZERO; Set<String> references=new HashSet<>();
        for(SocietyBankBookImportDtos.Row row:request.getRows()) {
            if(row.isDuplicate()||row.getFlatId()==null||row.getDate()==null||!inFinancialYear(row.getDate(),request.getFinancialYear())||row.getDebit()==null||row.getDebit().signum()<=0||row.getSourceReference()==null||row.getSourceReference().isBlank()||!references.add(row.getSourceReference())||transactionRepository.existsByAccountIdAndSourceReferenceAndAnnualCollectionIsNotNull(accountId,row.getSourceReference())) { skipped++; continue; }
            Flat flat=flatRepository.findByAccountIdAndIdAndActiveTrue(accountId,row.getFlatId()).orElseThrow(()->new ValidationException("Row "+row.getRowNumber()+": flat is not available"));
            SocietyAnnualCollection collection=collectionRepository.save(SocietyAnnualCollection.builder().account(account).flat(flat).financialYear(request.getFinancialYear())
                    .collectionType(SocietyCollectionType.MAINTENANCE).sourceName(clean(row.getSourceName(),flat.getOwnerName())).paymentDate(row.getDate()).amount(row.getDebit())
                    .paymentMode(importPaymentMode(row)).referenceNumber(clean(row.getReferenceNumber(),null)).transactionId(clean(row.getTransactionId(),null)).settlementId(clean(row.getSettlementId(),null))
                    .remarks(remarks(row)).build());
            transactionRepository.deleteOrphanBySourceReference(accountId,row.getSourceReference());
            transactionRepository.save(SocietyBankBookTransaction.builder().bankImport(bankImport).account(account).flat(flat).annualCollection(collection)
                    .rowNumber(row.getRowNumber()).sourceReference(row.getSourceReference()).transactionDate(row.getDate()).transactionType(row.getType()).flatText(row.getFlatText())
                    .particulars(row.getParticulars()).transactionId(row.getTransactionId()).bankReference(row.getReferenceNumber()).voucherNumber(row.getVoucherNumber())
                    .settlementId(row.getSettlementId()).debit(row.getDebit()).credit(row.getCredit()).balance(row.getBalance()).build());
            created++; amount=amount.add(row.getDebit());
        }
        bankImport.setCreatedRows(created); bankImport.setSkippedRows(skipped); bankImport.setImportedAmount(amount); importRepository.save(bankImport);
        return SocietyBankBookImportDtos.Result.builder().batchId(batchId).created(created).skipped(skipped).importedAmount(amount).build();
    }

    private SocietyBankBookImportDtos.Row parse(Row row,Map<String,Integer> c,DataFormatter f,FormulaEvaluator e,List<Flat> flats,Long accountId,String financialYear){
        String flatText=text(row,c.get("flat no."),f,e), transactionId=text(row,c.get("txn id / cheque no."),f,e), settlement=text(row,c.get("settlement id"),f,e);
        String reference=text(row,c.get("reference number"),f,e),voucher=text(row,c.get("voucher number"),f,e),particulars=text(row,c.get("particulars"),f,e);
        LocalDate date=date(row,c.get("date"),f,e); BigDecimal debit=decimal(row,c.get("debit"),f,e),credit=decimal(row,c.get("credit"),f,e),balance=decimal(row,c.get("balance"),f,e);
        PaymentMode paymentMode=receiptPaymentMode(text(row,c.get("type"),f,e));
        String prefix=paymentMode==PaymentMode.CASH?"CASHBOOK":"BANKBOOK";
        String sourceReference=paymentMode==PaymentMode.CASH&&!voucher.isBlank()?prefix+":VOUCHER:"+voucher.trim().toUpperCase(Locale.ROOT):!transactionId.isBlank()?prefix+":TXN:"+transactionId.trim().toUpperCase(Locale.ROOT):!settlement.isBlank()?prefix+":SETTLEMENT:"+settlement.trim().toUpperCase(Locale.ROOT):prefix+":"+date+":"+normalize(flatText)+":"+debit+":"+reference;
        Flat flat=matchFlat(flatText,flats); boolean duplicate=transactionRepository.existsByAccountIdAndSourceReferenceAndAnnualCollectionIsNotNull(accountId,sourceReference); List<String>warnings=new ArrayList<>();List<String>errors=new ArrayList<>();
        if(date==null)errors.add("Date is missing or invalid"); else if(!inFinancialYear(date,financialYear))errors.add("Date is outside "+financialYear); if(flat==null)warnings.add("Select a matching flat"); if(duplicate)warnings.add("Already imported");
        return SocietyBankBookImportDtos.Row.builder().rowNumber(row.getRowNum()+1).date(date).type(text(row,c.get("type"),f,e)).flatText(flatText)
                .flatId(flat==null?null:flat.getId()).flatLabel(flat==null?null:flat.getBlockName()+"-"+flat.getFlatNumber()).particulars(particulars).sourceName(sourceName(particulars))
                .transactionId(transactionId).referenceNumber(reference).voucherNumber(voucher).settlementId(settlement).debit(debit).credit(credit).balance(balance).paymentMode(paymentMode)
                .sourceReference(sourceReference).duplicate(duplicate).warnings(warnings).errors(errors).build();
    }
    private Flat matchFlat(String value,List<Flat> flats){String target=normalize(value);return flats.stream().filter(flat->normalize(flat.getBlockName()+"-"+flat.getFlatNumber()).equals(target)).findFirst().orElse(null);}
    private String sourceName(String particulars){if(particulars==null)return null;String first=particulars.split("\\R",2)[0].trim();return first.replaceFirst("(?i)^By\\s+","").replaceFirst("(?i)\\s+Voucher\\s+No\\.?\\s*.*$","").trim();}
    private String remarks(SocietyBankBookImportDtos.Row r){String book=r.getPaymentMode()==PaymentMode.CASH?"Cash book import":"Bank book import";return String.join(" | ",List.of(book,optional("Voucher",r.getVoucherNumber()))).replaceAll(" \\| $","");}
    private String optional(String label,String value){return value==null||value.isBlank()?"":label+": "+value;}
    private Row findHeader(Sheet s,DataFormatter f,FormulaEvaluator e){for(Row row:s){Map<String,Integer>h=headers(row,f,e);if(h.containsKey("date")&&h.containsKey("flat no.")&&h.containsKey("debit"))return row;}throw new ValidationException("Could not find the cash / bank book header row. Expected Date, Type, Flat No., Particulars, Reference Number, Voucher Number, Debit, Credit and Balance columns");}
    private Map<String,Integer> headers(Row r,DataFormatter f,FormulaEvaluator e){Map<String,Integer>m=new HashMap<>();for(Cell cell:r){String header=canonicalHeader(f.formatCellValue(cell,e));if(!header.isBlank())m.put(header,cell.getColumnIndex());}return m;}
    private String canonicalHeader(String value){String key=normalize(value);return switch(key){case "date"->"date";case "type"->"type";case "flatno","flatnumber"->"flat no.";case "particular","particulars","narration"->"particulars";case "txnidchequeno","transactionidchequenumber","transactionid","txnid"->"txn id / cheque no.";case "referenceno","referencenumber","reference"->"reference number";case "voucherno","vouchernumber","voucher"->"voucher number";case "settlementid"->"settlement id";case "debit","debitamount"->"debit";case "credit","creditamount"->"credit";case "balance","closingbalance"->"balance";default->value==null?"":value.trim().toLowerCase(Locale.ROOT);};}
    private void requireHeaders(Map<String,Integer>h,String...required){List<String>missing=Arrays.stream(required).filter(x->!h.containsKey(x)).toList();if(!missing.isEmpty())throw new ValidationException("Missing required column(s): "+String.join(", ",missing));}
    private String text(Row r,Integer col,DataFormatter f,FormulaEvaluator e){if(col==null)return "";Cell cell=r.getCell(col,Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);return cell==null?"":f.formatCellValue(cell,e).trim();}
    private BigDecimal decimal(Row r,Integer col,DataFormatter f,FormulaEvaluator e){String raw=text(r,col,f,e).replace(",","").replaceAll("(?i)\\s*[DC]$","").trim();if(raw.isBlank())return null;try{return new BigDecimal(raw);}catch(Exception ex){return null;}}
    private LocalDate date(Row r,Integer col,DataFormatter f,FormulaEvaluator e){if(col==null)return null;Cell cell=r.getCell(col,Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);if(cell==null)return null;try{if(cell.getCellType()==CellType.NUMERIC)return cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();String value=f.formatCellValue(cell,e).trim();for(DateTimeFormatter format:List.of(TEXT_DATE,DateTimeFormatter.ISO_LOCAL_DATE,DateTimeFormatter.ofPattern("dd/MM/uuuu"),DateTimeFormatter.ofPattern("dd-MM-uuuu"))){try{return LocalDate.parse(value,format);}catch(DateTimeParseException ignored){}}return null;}catch(Exception ex){return null;}}
    private boolean isEmpty(Row r,DataFormatter f,FormulaEvaluator e){for(Cell cell:r)if(!f.formatCellValue(cell,e).trim().isEmpty())return false;return true;}
    private String normalize(String s){return s==null?"":s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+","");}
    private void validateFile(MultipartFile f){if(f==null||f.isEmpty())throw new ValidationException("Select an Excel cash or bank book");if(f.getSize()>MAX_FILE_SIZE)throw new ValidationException("Excel file must be 10 MB or smaller");String n=Optional.ofNullable(f.getOriginalFilename()).orElse("").toLowerCase();if(!n.endsWith(".xlsx")&&!n.endsWith(".xls"))throw new ValidationException("Only .xlsx and .xls files are supported");}
    private void validateYear(String y){if(y==null||!y.matches("\\d{4}-\\d{4}"))throw new ValidationException("Financial year must look like 2026-2027");}
    private boolean inFinancialYear(LocalDate date,String year){int start=Integer.parseInt(year.substring(0,4));return !date.isBefore(LocalDate.of(start,4,1))&&!date.isAfter(LocalDate.of(start+1,3,31));}
    private Account societyAccount(Long id){Account a=accountRepository.findById(id).orElseThrow(()->new ValidationException("Account not found"));if(a.getAccountType()!=AccountType.SOCIETY)throw new ValidationException("Cash / bank book import is available only for society accounts");return a;}
    private PaymentMode receiptPaymentMode(String type){return normalize(type).contains("cash")?PaymentMode.CASH:PaymentMode.BANK;}
    private PaymentMode importPaymentMode(SocietyBankBookImportDtos.Row row){return row.getPaymentMode()==PaymentMode.CASH?PaymentMode.CASH:PaymentMode.BANK;}
    private String clean(String value,String fallback){return value==null||value.isBlank()?fallback:value.trim();}
}
