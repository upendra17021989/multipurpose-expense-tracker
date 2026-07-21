package com.app.service;
import com.app.dto.*;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class SocietyAnnualCollectionService {
    private final SocietyAnnualCollectionRepository repository;
    private final SocietyBankBookTransactionRepository bankBookTransactionRepository;
    private final AccountRepository accountRepository;
    private final FlatRepository flatRepository;
    private final AccountUserMembershipRepository membershipRepository;
    private final SocietyJournalLineRepository journalLineRepository;

    public List<SocietyAnnualCollectionDto> list(Long accountId, String year) {
        validateFinancialYear(year);
        return dtos(repository.findByAccountIdAndFinancialYearOrderByPaymentDateDescIdDesc(accountId, year));
    }
    public Page<SocietyAnnualCollectionDto> page(Long accountId, String year, String search, int page, int size) {
        validateFinancialYear(year);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<SocietyAnnualCollection> collections = repository.search(accountId, year, search == null ? "" : search.trim(),
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Order.desc("paymentDate"), Sort.Order.desc("id"))));
        List<SocietyAnnualCollectionDto> content = dtos(collections.getContent());
        return new org.springframework.data.domain.PageImpl<>(content, collections.getPageable(), collections.getTotalElements());
    }
    public List<SocietyAnnualCollectionDto> ledger(Long accountId, Long userId, String year, Long requestedFlatId) {
        Account account = accountRepository.findById(accountId).orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        boolean owner = account.getUser().getId().equals(userId);
        if (owner) return ledgerRows(accountId, year, requestedFlatId);
        AccountUserMembership membership = membershipRepository.findByAccountIdAndUserIdAndActiveTrue(accountId, userId)
                .orElseThrow(() -> new ValidationException("Approved society membership is required"));
        if (membership.getRole() == UserRole.ADMIN || membership.getRole() == UserRole.TREASURER) {
            return ledgerRows(accountId, year, requestedFlatId);
        }
        String block = normalize(membership.getRequestedBlockName());
        String number = normalize(membership.getRequestedFlatNumber());
        Flat assignedFlat = flatRepository.findByAccountIdAndActiveTrue(accountId).stream()
                .filter(flat -> normalize(flat.getBlockName()).equals(block) && normalize(flat.getFlatNumber()).equals(number))
                .findFirst().orElseThrow(() -> new ValidationException("Your membership is not assigned to an active flat"));
        if (requestedFlatId != null && !requestedFlatId.equals(assignedFlat.getId())) {
            throw new com.app.exception.UnauthorizedException("You can view only your assigned flat ledger");
        }
        return ledgerRows(accountId, year, assignedFlat.getId());
    }
    private List<SocietyAnnualCollectionDto> ledgerRows(Long accountId, String year, Long flatId) {
        if (flatId != null) flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, flatId).orElseThrow(() -> new ResourceNotFoundException("Flat not found"));
        List<SocietyAnnualCollection> collections = flatId == null
                ? repository.findByAccountIdAndFinancialYearOrderByPaymentDateDescIdDesc(accountId, year)
                : repository.findByAccountIdAndFinancialYearAndFlatIdOrderByPaymentDateDescIdDesc(accountId, year, flatId);
        List<SocietyAnnualCollectionDto> rows = new ArrayList<>(dtos(collections).stream().map(row -> {
            row.setEntryKey("COLLECTION-" + row.getId()); row.setEntryType("PAYMENT"); row.setCredit(row.getAmount()); row.setDebit(BigDecimal.ZERO);
            return row;
        }).toList());
        journalLineRepository.ledgerLines(accountId, year, flatId).forEach(line -> {
            SocietyJournalEntry entry = line.getJournalEntry(); Flat flat = line.getFlat();
            rows.add(SocietyAnnualCollectionDto.builder().id(line.getId()).entryKey("JOURNAL-" + line.getId()).entryType("JOURNAL")
                    .flatId(flat == null ? null : flat.getId()).flatLabel(flat == null ? null : flat.getBlockName()+"-"+flat.getFlatNumber())
                    .financialYear(year).sourceName(line.getLedgerName()).paymentDate(entry.getEntryDate()).amount(line.getDebit().signum()>0?line.getDebit():line.getCredit())
                    .referenceNumber(entry.getReferenceNumber()).voucherType(entry.getVoucherType()).voucherNumber(entry.getVoucherNumber())
                    .ledgerName(line.getLedgerName()).narration(entry.getNarration()).remarks(line.getParticulars()).debit(line.getDebit()).credit(line.getCredit()).build());
        });
        rows.sort(Comparator.comparing(SocietyAnnualCollectionDto::getPaymentDate)
                .thenComparing(row -> "JOURNAL".equals(row.getEntryType()) ? 0 : 1)
                .thenComparing(SocietyAnnualCollectionDto::getEntryKey));
        BigDecimal balance = BigDecimal.ZERO;
        for (SocietyAnnualCollectionDto row : rows) { balance = balance.add(value(row.getDebit())).subtract(value(row.getCredit())); row.setRunningBalance(balance); }
        return rows;
    }
    @Transactional public SocietyAnnualCollectionDto create(Long accountId, SocietyAnnualCollectionRequest r) {
        validateRequestYear(r);
        Account account = accountRepository.findById(accountId).orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        Flat flat = r.getFlatId() == null ? null : flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, r.getFlatId()).orElseThrow(() -> new ResourceNotFoundException("Flat not found"));
        if (r.getCollectionType() == SocietyCollectionType.MAINTENANCE && flat == null) throw new ValidationException("Select a flat for maintenance collection");
        SocietyAnnualCollection x = SocietyAnnualCollection.builder().account(account).flat(flat).financialYear(r.getFinancialYear()).collectionType(r.getCollectionType()).sourceName(r.getSourceName().trim()).paymentDate(r.getPaymentDate()).amount(r.getAmount()).paymentMode(r.getPaymentMode()).referenceNumber(clean(r.getReferenceNumber())).transactionId(clean(r.getTransactionId())).settlementId(clean(r.getSettlementId())).remarks(clean(r.getRemarks())).build();
        return dto(repository.save(x));
    }
    @Transactional public void delete(Long accountId, Long id) {
        SocietyAnnualCollection collection = repository.findByAccountIdAndId(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
        bankBookTransactionRepository.deleteByAnnualCollectionId(collection.getId());
        repository.delete(collection);
    }
    @Transactional public SocietyAnnualCollectionDto update(Long accountId, Long id, SocietyAnnualCollectionRequest r) {
        validateRequestYear(r);
        SocietyAnnualCollection x = repository.findByAccountIdAndId(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
        Flat flat = r.getFlatId() == null ? null : flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, r.getFlatId()).orElseThrow(() -> new ResourceNotFoundException("Flat not found"));
        if (r.getCollectionType() == SocietyCollectionType.MAINTENANCE && flat == null) throw new ValidationException("Select a flat for maintenance collection");
        x.setFlat(flat); x.setFinancialYear(r.getFinancialYear()); x.setCollectionType(r.getCollectionType()); x.setSourceName(r.getSourceName().trim()); x.setPaymentDate(r.getPaymentDate()); x.setAmount(r.getAmount()); x.setPaymentMode(r.getPaymentMode()); x.setReferenceNumber(clean(r.getReferenceNumber())); x.setTransactionId(clean(r.getTransactionId())); x.setSettlementId(clean(r.getSettlementId())); x.setRemarks(clean(r.getRemarks()));
        return dto(repository.save(x));
    }
    public BigDecimal total(Long accountId, String year) { validateFinancialYear(year); return repository.sumByAccountAndYear(accountId, year); }
    public BigDecimal total(Long accountId, String year, SocietyCollectionType type) { validateFinancialYear(year); return repository.sumByAccountAndYearAndType(accountId, year, type); }
    private String clean(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private void validateRequestYear(SocietyAnnualCollectionRequest request) {
        int start = validateFinancialYear(request.getFinancialYear());
        LocalDate firstDay = LocalDate.of(start, 4, 1);
        LocalDate lastDay = LocalDate.of(start + 1, 3, 31);
        if (request.getPaymentDate().isBefore(firstDay) || request.getPaymentDate().isAfter(lastDay)) {
            throw new ValidationException("Payment date must be within financial year " + request.getFinancialYear());
        }
    }
    private int validateFinancialYear(String year) {
        if (year == null || !year.matches("\\d{4}-\\d{4}")) throw new ValidationException("Financial year must look like 2025-2026");
        int start = Integer.parseInt(year.substring(0, 4));
        int end = Integer.parseInt(year.substring(5));
        if (end != start + 1) throw new ValidationException("Financial year must contain consecutive years");
        return start;
    }
    private String normalize(String value) { return value == null ? "" : value.toLowerCase(java.util.Locale.ROOT).replaceAll("\\bblock\\b", "").replaceAll("[^a-z0-9]", ""); }
    private BigDecimal value(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private List<SocietyAnnualCollectionDto> dtos(List<SocietyAnnualCollection> collections) {
        if (collections.isEmpty()) return List.of();
        Map<Long, SocietyBankBookTransaction> transactions = bankBookTransactionRepository.findByAnnualCollectionIdIn(collections.stream().map(SocietyAnnualCollection::getId).toList()).stream()
                .collect(Collectors.toMap(transaction -> transaction.getAnnualCollection().getId(), Function.identity(), (first, ignored) -> first));
        return collections.stream().map(collection -> dto(collection, transactions.get(collection.getId()))).toList();
    }
    private SocietyAnnualCollectionDto dto(SocietyAnnualCollection x) { return dto(x, null); }
    private SocietyAnnualCollectionDto dto(SocietyAnnualCollection x, SocietyBankBookTransaction transaction) { Flat f=x.getFlat(); return SocietyAnnualCollectionDto.builder().id(x.getId()).flatId(f==null?null:f.getId()).flatLabel(f==null?null:f.getBlockName()+"-"+f.getFlatNumber()).financialYear(x.getFinancialYear()).collectionType(x.getCollectionType()).sourceName(x.getSourceName()).paymentDate(x.getPaymentDate()).amount(x.getAmount()).paymentMode(x.getPaymentMode()).referenceNumber(x.getReferenceNumber()).transactionId(x.getTransactionId()).settlementId(x.getSettlementId()).narration(transaction==null?null:transaction.getParticulars()).remarks(x.getRemarks()).build(); }
}
