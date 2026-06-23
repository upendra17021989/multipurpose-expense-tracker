package com.app.service;

import com.app.dto.FestivalCollectionDemandRequest;
import com.app.dto.FestivalCollectionDto;
import com.app.dto.FestivalCollectionPaymentRequest;
import com.app.dto.FestivalCollectionReceiptDto;
import com.app.dto.FestivalCollectionSummaryDto;
import com.app.entity.Account;
import com.app.entity.FestivalCollection;
import com.app.entity.FestivalCollectionReceipt;
import com.app.entity.FestivalEvent;
import com.app.entity.Flat;
import com.app.entity.PaymentMode;
import com.app.entity.PaymentStatus;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.FestivalCollectionReceiptRepository;
import com.app.repository.FestivalCollectionRepository;
import com.app.repository.FestivalEventRepository;
import com.app.repository.FlatRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class FestivalCollectionService {

    private final FestivalCollectionRepository collectionRepository;
    private final FestivalCollectionReceiptRepository receiptRepository;
    private final FestivalEventRepository festivalEventRepository;
    private final FlatRepository flatRepository;
    private final AccountRepository accountRepository;

    public FestivalCollectionService(
            FestivalCollectionRepository collectionRepository,
            FestivalCollectionReceiptRepository receiptRepository,
            FestivalEventRepository festivalEventRepository,
            FlatRepository flatRepository,
            AccountRepository accountRepository) {
        this.collectionRepository = collectionRepository;
        this.receiptRepository = receiptRepository;
        this.festivalEventRepository = festivalEventRepository;
        this.flatRepository = flatRepository;
        this.accountRepository = accountRepository;
    }

    @Transactional(readOnly = true)
    public List<FestivalCollectionDto> getCollections(Long accountId, Long festivalEventId) {
        return collectionRepository.findByAccountIdAndFestivalEventId(accountId, festivalEventId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FestivalCollectionDto getCollection(Long accountId, Long collectionId) {
        return mapToDto(findCollection(accountId, collectionId));
    }

    @Transactional
    public List<FestivalCollectionDto> generateDemand(Long accountId, FestivalCollectionDemandRequest request) {
        FestivalEvent festivalEvent = festivalEventRepository.findByAccountIdAndId(accountId, request.getFestivalEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Festival event not found"));
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        List<Flat> flats = flatRepository.findByAccountIdAndActiveTrue(accountId);
        if (flats.isEmpty()) {
            throw new ValidationException("Add active flats before generating collection demand");
        }

        for (Flat flat : flats) {
            FestivalCollection collection = collectionRepository
                    .findByAccountIdAndFestivalEventIdAndFlatId(accountId, festivalEvent.getId(), flat.getId())
                    .orElseGet(() -> FestivalCollection.builder()
                            .account(account)
                            .festivalEvent(festivalEvent)
                            .flat(flat)
                            .collectedAmount(BigDecimal.ZERO)
                            .excessAmount(BigDecimal.ZERO)
                            .refundedAmount(BigDecimal.ZERO)
                            .build());
            collection.setExpectedAmount(request.getExpectedAmount());
            collection.setRemarks(trimToNull(request.getRemarks()));
            recalculateCollection(collection);
            collectionRepository.save(collection);
        }

        refreshFestivalCollectedAmount(festivalEvent);
        log.info("Festival collection demand generated for festival ID: {}", festivalEvent.getId());
        return getCollections(accountId, festivalEvent.getId());
    }

    @Transactional
    public FestivalCollectionDto updateDemand(Long accountId, Long collectionId, FestivalCollectionDemandRequest request) {
        FestivalCollection collection = findCollection(accountId, collectionId);
        if (!collection.getFestivalEvent().getId().equals(request.getFestivalEventId())) {
            throw new ValidationException("Festival event cannot be changed for an existing collection");
        }
        collection.setExpectedAmount(request.getExpectedAmount());
        collection.setRemarks(trimToNull(request.getRemarks()));
        recalculateCollection(collection);
        FestivalCollection saved = collectionRepository.save(collection);
        refreshFestivalCollectedAmount(saved.getFestivalEvent());
        return mapToDto(saved);
    }

    @Transactional
    public FestivalCollectionReceiptDto addPayment(Long accountId, Long collectionId, FestivalCollectionPaymentRequest request) {
        validatePayment(request);
        FestivalCollection collection = findCollection(accountId, collectionId);

        FestivalCollectionReceipt receipt = FestivalCollectionReceipt.builder()
                .festivalCollection(collection)
                .paymentDate(request.getPaymentDate())
                .amountPaid(request.getAmountPaid())
                .paymentMode(request.getPaymentMode())
                .transactionId(trimToNull(request.getTransactionId()))
                .utr(trimToNull(request.getUtr()))
                .chequeNumber(trimToNull(request.getChequeNumber()))
                .collectedBy(request.getCollectedBy().trim())
                .receiptNumber(buildReceiptNumber(collection))
                .remarks(trimToNull(request.getRemarks()))
                .build();

        collection.setCollectedAmount(nonNull(collection.getCollectedAmount()).add(request.getAmountPaid()));
        recalculateCollection(collection);
        collectionRepository.save(collection);
        FestivalCollectionReceipt savedReceipt = receiptRepository.save(receipt);
        refreshFestivalCollectedAmount(collection.getFestivalEvent());
        return mapReceiptToDto(savedReceipt);
    }

    @Transactional(readOnly = true)
    public List<FestivalCollectionReceiptDto> getReceipts(Long accountId, Long collectionId) {
        findCollection(accountId, collectionId);
        return receiptRepository.findByFestivalCollectionId(collectionId)
                .stream()
                .map(this::mapReceiptToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FestivalCollectionSummaryDto getSummary(Long accountId, Long festivalEventId) {
        List<FestivalCollection> collections = collectionRepository.findByAccountIdAndFestivalEventId(accountId, festivalEventId);
        BigDecimal expected = BigDecimal.ZERO;
        BigDecimal collected = BigDecimal.ZERO;
        BigDecimal pending = BigDecimal.ZERO;
        BigDecimal excess = BigDecimal.ZERO;
        BigDecimal refunded = BigDecimal.ZERO;
        long paid = 0;
        long pendingFlats = 0;
        long partial = 0;
        long excessFlats = 0;

        for (FestivalCollection collection : collections) {
            expected = expected.add(nonNull(collection.getExpectedAmount()));
            collected = collected.add(nonNull(collection.getCollectedAmount()));
            pending = pending.add(nonNull(collection.getPendingAmount()));
            excess = excess.add(nonNull(collection.getExcessAmount()));
            refunded = refunded.add(nonNull(collection.getRefundedAmount()));
            if (collection.getPaymentStatus() == PaymentStatus.PAID) paid++;
            if (collection.getPaymentStatus() == PaymentStatus.PENDING) pendingFlats++;
            if (collection.getPaymentStatus() == PaymentStatus.PARTIAL) partial++;
            if (collection.getPaymentStatus() == PaymentStatus.EXCESS) excessFlats++;
        }

        return FestivalCollectionSummaryDto.builder()
                .festivalEventId(festivalEventId)
                .totalExpected(expected)
                .totalCollected(collected)
                .totalPending(pending)
                .totalExcess(excess)
                .totalRefunded(refunded)
                .paidFlats(paid)
                .pendingFlats(pendingFlats)
                .partialFlats(partial)
                .excessFlats(excessFlats)
                .totalFlats(collections.size())
                .build();
    }

    private FestivalCollection findCollection(Long accountId, Long collectionId) {
        return collectionRepository.findByAccountIdAndId(accountId, collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Festival collection not found"));
    }

    private void validatePayment(FestivalCollectionPaymentRequest request) {
        if (request.getCollectedBy() == null || request.getCollectedBy().isBlank()) {
            throw new ValidationException("Collected by is required");
        }
        if ((request.getPaymentMode() == PaymentMode.UPI || request.getPaymentMode() == PaymentMode.NEFT)
                && (request.getUtr() == null || request.getUtr().isBlank())) {
            throw new ValidationException("UTR is required for UPI/NEFT payments");
        }
        if (request.getPaymentMode() == PaymentMode.CHEQUE
                && (request.getChequeNumber() == null || request.getChequeNumber().isBlank())) {
            throw new ValidationException("Cheque number is required for cheque payments");
        }
    }

    private void recalculateCollection(FestivalCollection collection) {
        BigDecimal expected = nonNull(collection.getExpectedAmount());
        BigDecimal collected = nonNull(collection.getCollectedAmount());
        BigDecimal difference = expected.subtract(collected);
        collection.setPendingAmount(difference.max(BigDecimal.ZERO));
        collection.setExcessAmount(collected.subtract(expected).max(BigDecimal.ZERO));
        collection.setUpdatedAt(LocalDateTime.now());

        if (collected.compareTo(BigDecimal.ZERO) == 0) {
            collection.setPaymentStatus(PaymentStatus.PENDING);
        } else if (collected.compareTo(expected) < 0) {
            collection.setPaymentStatus(PaymentStatus.PARTIAL);
        } else if (collected.compareTo(expected) == 0) {
            collection.setPaymentStatus(PaymentStatus.PAID);
        } else {
            collection.setPaymentStatus(PaymentStatus.EXCESS);
        }
    }

    private void refreshFestivalCollectedAmount(FestivalEvent festivalEvent) {
        BigDecimal total = collectionRepository.findByAccountIdAndFestivalEventId(
                        festivalEvent.getAccount().getId(), festivalEvent.getId())
                .stream()
                .map(FestivalCollection::getCollectedAmount)
                .map(this::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        festivalEvent.setCollectedAmount(total);
        festivalEventRepository.save(festivalEvent);
    }

    private String buildReceiptNumber(FestivalCollection collection) {
        long count = receiptRepository.findByFestivalCollectionId(collection.getId()).size() + 1L;
        return "FEST-" + collection.getFestivalEvent().getId() + "-" + collection.getFlat().getFlatNumber() + "-" + count;
    }

    private FestivalCollectionDto mapToDto(FestivalCollection collection) {
        Flat flat = collection.getFlat();
        FestivalEvent event = collection.getFestivalEvent();
        return FestivalCollectionDto.builder()
                .id(collection.getId())
                .accountId(collection.getAccount().getId())
                .festivalEventId(event.getId())
                .festivalName(event.getFestivalName())
                .flatId(flat.getId())
                .blockName(flat.getBlockName())
                .flatNumber(flat.getFlatNumber())
                .ownerName(flat.getOwnerName())
                .expectedAmount(collection.getExpectedAmount())
                .collectedAmount(collection.getCollectedAmount())
                .pendingAmount(collection.getPendingAmount())
                .excessAmount(collection.getExcessAmount())
                .refundedAmount(collection.getRefundedAmount())
                .paymentStatus(collection.getPaymentStatus())
                .remarks(collection.getRemarks())
                .createdAt(collection.getCreatedAt())
                .updatedAt(collection.getUpdatedAt())
                .build();
    }

    private FestivalCollectionReceiptDto mapReceiptToDto(FestivalCollectionReceipt receipt) {
        return FestivalCollectionReceiptDto.builder()
                .id(receipt.getId())
                .festivalCollectionId(receipt.getFestivalCollection().getId())
                .paymentDate(receipt.getPaymentDate())
                .amountPaid(receipt.getAmountPaid())
                .paymentMode(receipt.getPaymentMode())
                .transactionId(receipt.getTransactionId())
                .utr(receipt.getUtr())
                .chequeNumber(receipt.getChequeNumber())
                .collectedBy(receipt.getCollectedBy())
                .receiptNumber(receipt.getReceiptNumber())
                .receiptPdfUrl(receipt.getReceiptPdfUrl())
                .remarks(receipt.getRemarks())
                .createdAt(receipt.getCreatedAt())
                .build();
    }

    private BigDecimal nonNull(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
