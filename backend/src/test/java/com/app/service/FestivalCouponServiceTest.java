package com.app.service;

import com.app.entity.*;
import com.app.repository.*;
import org.junit.jupiter.api.*;
import org.mockito.*;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FestivalCouponServiceTest {
    @Mock FestivalCouponSettingRepository settings; @Mock FestivalCouponEntitlementRepository entitlements;
    @Mock FestivalCouponRepository coupons; @Mock FestivalEventRepository festivals;
    @Mock FestivalCollectionRepository collections; @Mock AccountRepository accounts;
    @Mock UserRepository users; @Mock AccountUserMembershipRepository memberships;
    FestivalCouponService service; Account account; User admin; FestivalEvent festival;

    @BeforeEach void setUp() {
        MockitoAnnotations.openMocks(this);
        admin = User.builder().id(7L).build();
        account = Account.builder().id(1L).user(admin).role(UserRole.ADMIN).build();
        festival = FestivalEvent.builder().id(2L).account(account).build();
        service = new FestivalCouponService(settings, entitlements, coupons, festivals, collections, accounts, users, memberships);
        when(accounts.findById(1L)).thenReturn(Optional.of(account));
        when(users.findById(7L)).thenReturn(Optional.of(admin));
        when(festivals.findByAccountIdAndIdAndDeletedAtIsNull(1L, 2L)).thenReturn(Optional.of(festival));
        when(settings.findByAccountIdAndFestivalEventId(1L, 2L)).thenReturn(Optional.of(FestivalCouponSetting.builder()
                .account(account).festivalEvent(festival).defaultCouponCount(2).couponName(null).createdBy(admin).build()));
        when(entitlements.findByAccountIdAndFestivalEventId(1L, 2L)).thenReturn(List.of());
    }
    @Test void generatesForPaidAndExcessButSkipsPartial() {
        when(collections.findByAccountIdAndFestivalEventId(1L, 2L)).thenReturn(List.of(
                collection(10L, 100, 100), collection(11L, 100, 125), collection(12L, 100, 50)));
        var result = service.generate(1L, 7L, 2L);
        assertThat(result.getEligibleFlats()).isEqualTo(2);
        assertThat(result.getCreatedCoupons()).isEqualTo(4);
        assertThat(result.getSkippedFlats()).isEqualTo(1);
        verify(coupons, times(4)).save(any(FestivalCoupon.class));
    }

    @Test void repeatedGenerationDoesNotCreateDuplicates() {
        when(collections.findByAccountIdAndFestivalEventId(1L, 2L)).thenReturn(List.of(collection(10L, 100, 100)));
        when(coupons.findByAccountIdAndFestivalCollectionIdOrderBySequenceNumberAsc(1L, 10L)).thenReturn(List.of(
                FestivalCoupon.builder().sequenceNumber(1).status(FestivalCouponStatus.ACTIVE).build(),
                FestivalCoupon.builder().sequenceNumber(2).status(FestivalCouponStatus.ACTIVE).build()));
        var result = service.generate(1L, 7L, 2L);
        assertThat(result.getCreatedCoupons()).isZero();
        assertThat(result.getExistingCoupons()).isEqualTo(2);
        verify(coupons, never()).save(any());
    }

    private FestivalCollection collection(Long id, long expected, long paid) {
        Flat flat = Flat.builder().id(id).account(account).build();
        return FestivalCollection.builder().id(id).account(account).festivalEvent(festival).flat(flat)
                .expectedAmount(BigDecimal.valueOf(expected)).collectedAmount(BigDecimal.valueOf(paid)).build();
    }
}
