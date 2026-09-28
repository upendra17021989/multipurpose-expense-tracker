package com.app.service;

import com.app.entity.FestivalCollection;
import com.app.entity.FestivalEvent;
import com.app.entity.Flat;
import com.app.repository.FestivalCollectionReceiptRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FestivalCollectionServiceTest {

    @Test
    void receiptNumberIncludesNormalizedBlockName() {
        FestivalCollectionReceiptRepository receipts = mock(FestivalCollectionReceiptRepository.class);
        FestivalCollection collection = FestivalCollection.builder()
                .id(10L)
                .festivalEvent(FestivalEvent.builder().id(3L).build())
                .flat(Flat.builder().blockName("H Block").flatNumber("403-A").build())
                .build();
        when(receipts.findByFestivalCollectionId(10L)).thenReturn(List.of());

        FestivalCollectionService service = new FestivalCollectionService(
                null, receipts, null, null, null, null, null, null);

        assertEquals("FEST-3-H-BLOCK-403-A-1", service.buildReceiptNumber(collection));
    }

    @Test
    void accountAdminCanEditPaymentWithoutMembership() {
        var accounts = mock(com.app.repository.AccountRepository.class);
        var memberships = mock(com.app.repository.AccountUserMembershipRepository.class);
        var owner = com.app.entity.User.builder().id(7L).build();
        var account = com.app.entity.Account.builder().id(42L).user(owner)
                .role(com.app.entity.UserRole.ADMIN).build();
        when(accounts.findById(42L)).thenReturn(java.util.Optional.of(account));
        FestivalCollectionService service = new FestivalCollectionService(
                null, null, null, null, null, accounts, memberships, null);

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> service.validatePaymentUpdateAccess(42L, 7L));
        org.mockito.Mockito.verifyNoInteractions(memberships);
    }

    @Test
    void nonAdminWithoutMembershipCannotEditPayment() {
        var accounts = mock(com.app.repository.AccountRepository.class);
        var memberships = mock(com.app.repository.AccountUserMembershipRepository.class);
        var owner = com.app.entity.User.builder().id(7L).build();
        var account = com.app.entity.Account.builder().id(42L).user(owner)
                .role(com.app.entity.UserRole.MEMBER).build();
        when(accounts.findById(42L)).thenReturn(java.util.Optional.of(account));
        when(memberships.findByAccountIdAndUserIdAndActiveTrue(42L, 7L))
                .thenReturn(java.util.Optional.empty());
        FestivalCollectionService service = new FestivalCollectionService(
                null, null, null, null, null, accounts, memberships, null);

        org.junit.jupiter.api.Assertions.assertThrows(com.app.exception.ValidationException.class,
                () -> service.validatePaymentUpdateAccess(42L, 7L));
    }
    @Test
    void editingReceiptRecalculatesCollectionBalanceAndStatus() {
        var collections = mock(com.app.repository.FestivalCollectionRepository.class);
        var receipts = mock(com.app.repository.FestivalCollectionReceiptRepository.class);
        var otherCollections = mock(com.app.repository.FestivalOtherCollectionRepository.class);
        var events = mock(com.app.repository.FestivalEventRepository.class);
        var accounts = mock(com.app.repository.AccountRepository.class);
        var memberships = mock(com.app.repository.AccountUserMembershipRepository.class);
        var owner = com.app.entity.User.builder().id(7L).build();
        var account = com.app.entity.Account.builder().id(42L).user(owner)
                .role(com.app.entity.UserRole.ADMIN).build();
        var event = com.app.entity.FestivalEvent.builder().id(3L).account(account).build();
        var collection = FestivalCollection.builder().id(10L).account(account).festivalEvent(event)
                .expectedAmount(new java.math.BigDecimal("1000.00"))
                .collectedAmount(new java.math.BigDecimal("1000.00")).build();
        var receipt = com.app.entity.FestivalCollectionReceipt.builder().id(231L)
                .festivalCollection(collection).amountPaid(new java.math.BigDecimal("1000.00")).build();
        when(collections.findByAccountIdAndId(42L, 10L)).thenReturn(java.util.Optional.of(collection));
        when(accounts.findById(42L)).thenReturn(java.util.Optional.of(account));
        when(receipts.findById(231L)).thenReturn(java.util.Optional.of(receipt));
        when(receipts.save(receipt)).thenReturn(receipt);
        when(receipts.findByFestivalCollectionId(10L)).thenReturn(List.of(receipt));
        when(collections.findByAccountIdAndFestivalEventId(42L, 3L)).thenReturn(List.of(collection));
        when(otherCollections.findByAccountIdAndFestivalEventIdOrderByPaymentDateDescCreatedAtDesc(42L, 3L))
                .thenReturn(List.of());
        var service = new FestivalCollectionService(collections, receipts, otherCollections,
                events, null, accounts, memberships, null);
        var request = com.app.dto.FestivalCollectionPaymentRequest.builder()
                .paymentDate(java.time.LocalDate.of(2026, 9, 28))
                .amountPaid(new java.math.BigDecimal("1100.00"))
                .paymentMode(com.app.entity.PaymentMode.CASH).collectedBy("Admin").build();

        service.updatePayment(42L, 7L, 10L, 231L, request);

        assertEquals(new java.math.BigDecimal("1100.00"), collection.getCollectedAmount());
        assertEquals(0, collection.getPendingAmount().compareTo(java.math.BigDecimal.ZERO));
        assertEquals(new java.math.BigDecimal("100.00"), collection.getExcessAmount());
        assertEquals(com.app.entity.PaymentStatus.EXCESS, collection.getPaymentStatus());
        assertEquals(new java.math.BigDecimal("1100.00"), event.getCollectedAmount());
    }}
