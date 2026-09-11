package com.app.service;

import com.app.dto.FestivalOtherCollectionDtos.Dto;
import com.app.dto.FestivalOtherCollectionDtos.Request;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FestivalOtherCollectionService {
    private static final Set<String> TYPES = Set.of("DONATION", "SPONSORSHIP", "STALL_FEE", "ADVERTISEMENT", "VENDOR_CONTRIBUTION", "COMMITTEE_CONTRIBUTION", "INTEREST", "OTHER");
    private static final Set<String> KINDS = Set.of("MONETARY", "IN_KIND", "SERVICE");

    private final AccountRepository accounts;
    private final FestivalEventRepository events;
    private final FestivalOtherCollectionRepository collections;
    private final FestivalCollectionRepository flatCollections;
    private final UserRepository users;
    private final SocietyAuditEventRepository audit;

    @Transactional(readOnly = true)
    public java.util.List<Dto> list(Long accountId, Long eventId) {
        event(accountId, eventId);
        return collections.findByAccountIdAndFestivalEventIdOrderByPaymentDateDescCreatedAtDesc(accountId, eventId)
                .stream().map(this::dto).toList();
    }

    @Transactional
    public Dto create(Long accountId, Long userId, Long eventId, Request request) {
        FestivalEvent festival = event(accountId, eventId);
        Account account = accounts.findById(accountId).orElseThrow();
        User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validate(request);
        boolean anonymous = Boolean.TRUE.equals(request.getAnonymous());
        String kind = kind(request.getContributionKind());
        FestivalOtherCollection contribution = collections.save(FestivalOtherCollection.builder()
                .account(account).festivalEvent(festival).sourceType(type(request.getSourceType()))
                .contributionKind(kind).contributorName(anonymous ? null : clean(request.getContributorName()))
                .contactDetails(clean(request.getContactDetails())).itemName(clean(request.getItemName()))
                .quantity(clean(request.getQuantity())).amount(request.getAmount()).paymentDate(request.getPaymentDate())
                .paymentMode(kind.equals("MONETARY") ? request.getPaymentMode() : null)
                .transactionReference(kind.equals("MONETARY") ? clean(request.getTransactionReference()) : null)
                .collectedBy(request.getCollectedBy().trim()).description(clean(request.getDescription()))
                .specialMention(Boolean.TRUE.equals(request.getSpecialMention())).anonymous(anonymous).createdBy(user).build());
        refresh(festival);
        audit(account, user, "FESTIVAL_OTHER_COLLECTION_CREATED", contribution, eventId);
        return dto(contribution);
    }

    @Transactional
    public Dto update(Long accountId, Long userId, Long id, Request request) {
        FestivalOtherCollection contribution = find(accountId, id);
        validate(request);
        boolean anonymous = Boolean.TRUE.equals(request.getAnonymous());
        String kind = kind(request.getContributionKind());
        contribution.setSourceType(type(request.getSourceType()));
        contribution.setContributionKind(kind);
        contribution.setContributorName(anonymous ? null : clean(request.getContributorName()));
        contribution.setContactDetails(clean(request.getContactDetails()));
        contribution.setItemName(clean(request.getItemName()));
        contribution.setQuantity(clean(request.getQuantity()));
        contribution.setAmount(request.getAmount());
        contribution.setPaymentDate(request.getPaymentDate());
        contribution.setPaymentMode(kind.equals("MONETARY") ? request.getPaymentMode() : null);
        contribution.setTransactionReference(kind.equals("MONETARY") ? clean(request.getTransactionReference()) : null);
        contribution.setCollectedBy(request.getCollectedBy().trim());
        contribution.setDescription(clean(request.getDescription()));
        contribution.setSpecialMention(Boolean.TRUE.equals(request.getSpecialMention()));
        contribution.setAnonymous(anonymous);
        collections.save(contribution);
        refresh(contribution.getFestivalEvent());
        audit(contribution.getAccount(), users.findById(userId).orElse(null), "FESTIVAL_OTHER_COLLECTION_UPDATED", contribution, contribution.getFestivalEvent().getId());
        return dto(contribution);
    }

    @Transactional
    public void delete(Long accountId, Long userId, Long id) {
        FestivalOtherCollection contribution = find(accountId, id);
        FestivalEvent festival = contribution.getFestivalEvent();
        Account account = contribution.getAccount();
        collections.delete(contribution);
        collections.flush();
        refresh(festival);
        audit(account, users.findById(userId).orElse(null), "FESTIVAL_OTHER_COLLECTION_DELETED", contribution, festival.getId());
    }

    private void validate(Request request) {
        String contributionKind = kind(request.getContributionKind());
        boolean anonymous = Boolean.TRUE.equals(request.getAnonymous());
        if (!anonymous && (request.getContributorName() == null || request.getContributorName().isBlank()))
            throw new ValidationException("Contributor or source name is required unless anonymous");
        if (contributionKind.equals("MONETARY") && request.getAmount() == null)
            throw new ValidationException("Amount is required for a monetary contribution");
        if (contributionKind.equals("MONETARY") && request.getPaymentMode() == null)
            throw new ValidationException("Payment mode is required for a monetary contribution");
        if (!contributionKind.equals("MONETARY") && (request.getItemName() == null || request.getItemName().isBlank()))
            throw new ValidationException("Item or service name is required for an in-kind contribution");
    }

    private void refresh(FestivalEvent festival) {
        BigDecimal flatTotal = flatCollections.findByAccountIdAndFestivalEventId(festival.getAccount().getId(), festival.getId())
                .stream().map(FestivalCollection::getCollectedAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal otherTotal = collections.findByAccountIdAndFestivalEventIdOrderByPaymentDateDescCreatedAtDesc(festival.getAccount().getId(), festival.getId())
                .stream().filter(item -> "MONETARY".equals(item.getContributionKind()))
                .map(FestivalOtherCollection::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        festival.setCollectedAmount(flatTotal.add(otherTotal));
        events.save(festival);
    }

    private FestivalEvent event(Long accountId, Long id) {
        return events.findByAccountIdAndIdAndDeletedAtIsNull(accountId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Festival event not found"));
    }

    private FestivalOtherCollection find(Long accountId, Long id) {
        return collections.findByAccountIdAndId(accountId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Other collection not found"));
    }

    private String type(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        if (!TYPES.contains(normalized)) throw new ValidationException("Invalid collection source type");
        return normalized;
    }

    private String kind(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        if (!KINDS.contains(normalized)) throw new ValidationException("Invalid contribution kind");
        return normalized;
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private void audit(Account account, User user, String action, FestivalOtherCollection contribution, Long eventId) {
        audit.save(SocietyAuditEvent.builder().account(account).actor(user).action(action)
                .entityType("FESTIVAL_OTHER_COLLECTION").entityId(contribution.getId())
                .details("eventId=" + eventId + ", kind=" + contribution.getContributionKind() + ", value=" + contribution.getAmount()).build());
    }

    private Dto dto(FestivalOtherCollection contribution) {
        return Dto.builder().id(contribution.getId()).festivalEventId(contribution.getFestivalEvent().getId())
                .sourceType(contribution.getSourceType()).contributionKind(contribution.getContributionKind())
                .contributorName(contribution.getAnonymous() ? "Anonymous" : contribution.getContributorName())
                .contactDetails(contribution.getContactDetails()).itemName(contribution.getItemName())
                .quantity(contribution.getQuantity()).amount(contribution.getAmount()).paymentDate(contribution.getPaymentDate())
                .paymentMode(contribution.getPaymentMode()).transactionReference(contribution.getTransactionReference())
                .collectedBy(contribution.getCollectedBy()).description(contribution.getDescription())
                .specialMention(contribution.getSpecialMention()).anonymous(contribution.getAnonymous())
                .createdBy(contribution.getCreatedBy().getName()).createdAt(contribution.getCreatedAt()).build();
    }
}
