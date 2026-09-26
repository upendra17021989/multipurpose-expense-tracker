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
import com.app.repository.AccountUserMembershipRepository;
import com.app.repository.FestivalCollectionReceiptRepository;
import com.app.repository.FestivalCollectionRepository;
import com.app.repository.FestivalOtherCollectionRepository;
import com.app.repository.FestivalEventRepository;
import com.app.repository.FlatRepository;
import com.app.repository.ExpenseRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class FestivalCollectionService {

    private final FestivalCollectionRepository collectionRepository;
    private final FestivalCollectionReceiptRepository receiptRepository;
    private final FestivalOtherCollectionRepository otherCollectionRepository;
    private final FestivalEventRepository festivalEventRepository;
    private final FlatRepository flatRepository;
    private final AccountRepository accountRepository;
    private final AccountUserMembershipRepository membershipRepository;
    private final ExpenseRepository expenseRepository;

    public FestivalCollectionService(
            FestivalCollectionRepository collectionRepository,
            FestivalCollectionReceiptRepository receiptRepository,
            FestivalOtherCollectionRepository otherCollectionRepository,
            FestivalEventRepository festivalEventRepository,
            FlatRepository flatRepository,
            AccountRepository accountRepository,
            AccountUserMembershipRepository membershipRepository,
            ExpenseRepository expenseRepository) {
        this.collectionRepository = collectionRepository;
        this.receiptRepository = receiptRepository;
        this.otherCollectionRepository = otherCollectionRepository;
        this.festivalEventRepository = festivalEventRepository;
        this.flatRepository = flatRepository;
        this.accountRepository = accountRepository;
        this.membershipRepository = membershipRepository;
        this.expenseRepository = expenseRepository;
    }

    @Transactional(readOnly = true)
    public List<FestivalCollectionDto> getCollections(Long accountId, Long festivalEventId) {
        return collectionRepository.findByAccountIdAndFestivalEventId(accountId, festivalEventId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<FestivalCollectionDto> getCollectionsPage(Long accountId, Long festivalEventId, String blockName,
            String status, String search, int page, int size) {
        PaymentStatus paymentStatus = valueOrEmpty(status).isEmpty() ? null : PaymentStatus.valueOf(valueOrEmpty(status).toUpperCase());
        return collectionRepository.searchPage(accountId, festivalEventId, valueOrEmpty(blockName),
                paymentStatus, valueOrEmpty(search),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 1000)));
    }

    @Transactional(readOnly = true)
    public FestivalCollectionDto getCollection(Long accountId, Long collectionId) {
        return mapToDto(findCollection(accountId, collectionId));
    }

    @Transactional
    public List<FestivalCollectionDto> generateDemand(Long accountId, FestivalCollectionDemandRequest request) {
        FestivalEvent festivalEvent = festivalEventRepository.findByAccountIdAndIdAndDeletedAtIsNull(accountId, request.getFestivalEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Festival event not found"));
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        List<Flat> flats = flatRepository.findByAccountIdAndActiveTrue(accountId);
        if (flats.isEmpty()) {
            throw new ValidationException("Add active flats before generating collection demand");
        }

        java.util.Map<Long, FestivalCollection> existingByFlat = collectionRepository
                .findByAccountIdAndFestivalEventId(accountId, festivalEvent.getId()).stream()
                .collect(java.util.stream.Collectors.toMap(row -> row.getFlat().getId(), row -> row));
        for (Flat flat : flats) {
            FestivalCollection collection = java.util.Optional.ofNullable(existingByFlat.get(flat.getId()))
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
    public FestivalCollectionReceiptDto addPayment(Long accountId, Long userId, Long collectionId, FestivalCollectionPaymentRequest request) {
        validatePayment(request);
        FestivalCollection collection = findCollection(accountId, collectionId);
        validateCollectionPaymentAccess(accountId, userId, collection);

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

    @Transactional
    public FestivalCollectionReceiptDto updatePayment(Long accountId, Long userId, Long collectionId,
            Long receiptId, FestivalCollectionPaymentRequest request) {
        validatePayment(request);
        FestivalCollection collection = findCollection(accountId, collectionId);
        validatePaymentUpdateAccess(accountId, userId);
        FestivalCollectionReceipt receipt = receiptRepository.findById(receiptId)
                .filter(item -> item.getFestivalCollection().getId().equals(collectionId))
                .orElseThrow(() -> new ResourceNotFoundException("Festival payment not found"));

        collection.setCollectedAmount(nonNull(collection.getCollectedAmount())
                .subtract(nonNull(receipt.getAmountPaid())).add(request.getAmountPaid()));
        recalculateCollection(collection);
        receipt.setPaymentDate(request.getPaymentDate());
        receipt.setAmountPaid(request.getAmountPaid());
        receipt.setPaymentMode(request.getPaymentMode());
        receipt.setTransactionId(trimToNull(request.getTransactionId()));
        receipt.setUtr(trimToNull(request.getUtr()));
        receipt.setChequeNumber(trimToNull(request.getChequeNumber()));
        receipt.setCollectedBy(request.getCollectedBy().trim());
        receipt.setRemarks(trimToNull(request.getRemarks()));
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
        // Aggregate in the database to avoid loading entities and one lazy flat per collection.
        var collections = collectionRepository.summarize(accountId, festivalEventId);

        return FestivalCollectionSummaryDto.builder()
                .festivalEventId(festivalEventId)
                .totalExpected(collections.getTotalExpected())
                .flatCollected(collections.getFlatCollected())
                .otherCollected(collections.getOtherCollected())
                .totalCollected(collections.getFlatCollected().add(collections.getOtherCollected()))
                .totalPending(collections.getTotalPending())
                .totalExcess(collections.getTotalExcess())
                .totalRefunded(collections.getTotalRefunded())
                .paidFlats(collections.getPaidFlats())
                .pendingFlats(collections.getPendingFlats())
                .partialFlats(collections.getPartialFlats())
                .excessFlats(collections.getExcessFlats())
                .totalFlats(collections.getTotalFlats())
                .totalBlocks(collections.getTotalBlocks())
                .otherCollectionsCount(collections.getOtherCollectionsCount())
                .expenseCount(collections.getExpenseCount())
                .paidExpenses(collections.getPaidExpenses())
                .recordedExpenses(collections.getRecordedExpenses())
                .build();
    }

    private FestivalCollection findCollection(Long accountId, Long collectionId) {
        return collectionRepository.findByAccountIdAndId(accountId, collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Festival collection not found"));
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private void validatePayment(FestivalCollectionPaymentRequest request) {
        if (request.getCollectedBy() == null || request.getCollectedBy().isBlank()) {
            throw new ValidationException("Collected by is required");
        }
        if (request.getPaymentMode() == PaymentMode.CHEQUE
                && (request.getChequeNumber() == null || request.getChequeNumber().isBlank())) {
            throw new ValidationException("Cheque number is required for cheque payments");
        }
    }

    private void validateCollectionPaymentAccess(Long accountId, Long userId, FestivalCollection collection) {
        membershipRepository.findByAccountIdAndUserIdAndActiveTrue(accountId, userId).ifPresent(membership -> {
            if (membership.getRole() == com.app.entity.UserRole.BLOCK_REPRESENTATIVE
                    && !collection.getFlat().getBlockName().equalsIgnoreCase(membership.getRequestedBlockName())) {
                throw new ValidationException("Block representatives can update payments only for flats in their assigned block");
            }
        });
    }

    private void validatePaymentUpdateAccess(Long accountId, Long userId) {
        var membership = membershipRepository.findByAccountIdAndUserIdAndActiveTrue(accountId, userId)
                .orElseThrow(() -> new ValidationException("An active society membership is required"));
        if (membership.getRole() != com.app.entity.UserRole.ADMIN) {
            throw new ValidationException("Only society admins can edit recorded payments");
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
        festivalEvent.setCollectedAmount(total.add(otherTotal(festivalEvent.getAccount().getId(), festivalEvent.getId())));
        festivalEventRepository.save(festivalEvent);
    }

    private BigDecimal otherTotal(Long accountId, Long festivalEventId) {
        return otherCollectionRepository.findByAccountIdAndFestivalEventIdOrderByPaymentDateDescCreatedAtDesc(accountId, festivalEventId)
                .stream().filter(item -> "MONETARY".equals(item.getContributionKind()))
                .map(com.app.entity.FestivalOtherCollection::getAmount).filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    String buildReceiptNumber(FestivalCollection collection) {
        long count = receiptRepository.findByFestivalCollectionId(collection.getId()).size() + 1L;
        Flat flat = collection.getFlat();
        return "FEST-" + collection.getFestivalEvent().getId()
                + "-" + receiptNumberPart(flat.getBlockName())
                + "-" + receiptNumberPart(flat.getFlatNumber())
                + "-" + count;
    }

    private String receiptNumberPart(String value) {
        return value.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "-").replaceAll("^-|-$", "");
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
