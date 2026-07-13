package com.app.service;
import com.app.dto.*;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service @RequiredArgsConstructor
public class SocietyAnnualCollectionService {
    private final SocietyAnnualCollectionRepository repository;
    private final SocietyBankBookTransactionRepository bankBookTransactionRepository;
    private final AccountRepository accountRepository;
    private final FlatRepository flatRepository;

    public List<SocietyAnnualCollectionDto> list(Long accountId, String year) {
        return repository.findByAccountIdAndFinancialYearOrderByPaymentDateDescIdDesc(accountId, year).stream().map(this::dto).toList();
    }
    @Transactional public SocietyAnnualCollectionDto create(Long accountId, SocietyAnnualCollectionRequest r) {
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
        SocietyAnnualCollection x = repository.findByAccountIdAndId(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
        Flat flat = r.getFlatId() == null ? null : flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, r.getFlatId()).orElseThrow(() -> new ResourceNotFoundException("Flat not found"));
        if (r.getCollectionType() == SocietyCollectionType.MAINTENANCE && flat == null) throw new ValidationException("Select a flat for maintenance collection");
        x.setFlat(flat); x.setFinancialYear(r.getFinancialYear()); x.setCollectionType(r.getCollectionType()); x.setSourceName(r.getSourceName().trim()); x.setPaymentDate(r.getPaymentDate()); x.setAmount(r.getAmount()); x.setPaymentMode(r.getPaymentMode()); x.setReferenceNumber(clean(r.getReferenceNumber())); x.setTransactionId(clean(r.getTransactionId())); x.setSettlementId(clean(r.getSettlementId())); x.setRemarks(clean(r.getRemarks()));
        return dto(repository.save(x));
    }
    public BigDecimal total(Long accountId, String year) { return repository.findByAccountIdAndFinancialYearOrderByPaymentDateDescIdDesc(accountId, year).stream().map(SocietyAnnualCollection::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add); }
    private String clean(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private SocietyAnnualCollectionDto dto(SocietyAnnualCollection x) { Flat f=x.getFlat(); return SocietyAnnualCollectionDto.builder().id(x.getId()).flatId(f==null?null:f.getId()).flatLabel(f==null?null:f.getBlockName()+"-"+f.getFlatNumber()).financialYear(x.getFinancialYear()).collectionType(x.getCollectionType()).sourceName(x.getSourceName()).paymentDate(x.getPaymentDate()).amount(x.getAmount()).paymentMode(x.getPaymentMode()).referenceNumber(x.getReferenceNumber()).transactionId(x.getTransactionId()).settlementId(x.getSettlementId()).remarks(x.getRemarks()).build(); }
}
