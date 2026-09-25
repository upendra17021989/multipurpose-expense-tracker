package com.app.service;

import com.app.dto.FestivalCouponDtos.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class FestivalCouponService {
    private final FestivalCouponSettingRepository settings;
    private final FestivalCouponEntitlementRepository entitlements;
    private final FestivalCouponRepository coupons;
    private final FestivalEventRepository festivals;
    private final FestivalCollectionRepository collections;
    private final AccountRepository accounts;
    private final UserRepository users;
    private final AccountUserMembershipRepository memberships;

    @Transactional(readOnly = true)
    public Dashboard dashboard(Long accountId, Long userId, Long festivalId) {
        FestivalEvent festival = festival(accountId, festivalId);
        Access access = access(accountId, userId);
        FestivalCouponSetting setting = settings.findByAccountIdAndFestivalEventId(accountId, festivalId).orElse(null);
        Map<Long, FestivalCouponEntitlement> overrides = entitlements.findByAccountIdAndFestivalEventId(accountId, festivalId).stream()
                .collect(Collectors.toMap(x -> x.getFestivalCollection().getId(), Function.identity()));
        Map<Long, List<FestivalCoupon>> issued = coupons.findByAccountIdAndFestivalEventIdOrderByFlatBlockNameAscFlatFlatNumberAscSequenceNumberAsc(accountId, festivalId).stream()
                .collect(Collectors.groupingBy(x -> x.getFestivalCollection().getId()));
        List<Eligibility> rows = collections.findByAccountIdAndFestivalEventId(accountId, festivalId).stream()
                .filter(c -> visible(access, c.getFlat())).map(c -> eligibility(c, setting, overrides.get(c.getId()), issued.getOrDefault(c.getId(), List.of()))).toList();
        return Dashboard.builder().settings(map(setting, festivalId)).flats(rows)
                .eligibleFlats(rows.stream().filter(Eligibility::isEligible).count()).ineligibleFlats(rows.stream().filter(x -> !x.isEligible()).count())
                .configuredCoupons(rows.stream().filter(Eligibility::isEligible).mapToLong(Eligibility::getEffectiveCouponCount).sum())
                .generatedCoupons(rows.stream().mapToLong(Eligibility::getGeneratedCount).sum())
                .activeCoupons(rows.stream().mapToLong(Eligibility::getActiveCount).sum()).usedCoupons(rows.stream().mapToLong(Eligibility::getUsedCount).sum())
                .discrepancyFlats(rows.stream().filter(Eligibility::isDiscrepancy).count()).build();
    }

    @Transactional
    public Settings saveSettings(Long accountId, Long userId, Long festivalId, SettingsRequest request) {
        requireAdmin(accountId, userId); FestivalEvent festival = festival(accountId, festivalId);
        FestivalCouponSetting item = settings.findByAccountIdAndFestivalEventId(accountId, festivalId).orElseGet(() -> FestivalCouponSetting.builder()
                .account(account(accountId)).festivalEvent(festival).createdBy(user(userId)).build());
        item.setCouponName(request.getCouponName().trim()); item.setDefaultCouponCount(request.getDefaultCouponCount());
        return map(settings.save(item), festivalId);
    }

    @Transactional
    public Eligibility saveOverride(Long accountId, Long userId, Long festivalId, Long collectionId, EntitlementRequest request) {
        requireAdmin(accountId, userId); FestivalEvent festival = festival(accountId, festivalId);
        FestivalCollection collection = collections.findByAccountIdAndIdAndFestivalEventId(accountId, collectionId, festivalId)
                .orElseThrow(() -> new ResourceNotFoundException("Festival collection not found"));
        FestivalCouponEntitlement item = entitlements.findByAccountIdAndFestivalCollectionId(accountId, collectionId).orElseGet(() -> FestivalCouponEntitlement.builder()
                .account(account(accountId)).festivalEvent(festival).festivalCollection(collection).build());
        item.setCouponCountOverride(request.getCouponCountOverride()); entitlements.save(item);
        FestivalCouponSetting setting = settings.findByAccountIdAndFestivalEventId(accountId, festivalId).orElse(null);
        List<FestivalCoupon> issued = coupons.findByAccountIdAndFestivalCollectionIdOrderBySequenceNumberAsc(accountId, collectionId);
        return eligibility(collection, setting, item, issued);
    }

    @Transactional
    public GenerationResult generate(Long accountId, Long userId, Long festivalId) {
        requireAdmin(accountId, userId); FestivalEvent festival = festival(accountId, festivalId);
        FestivalCouponSetting setting = settings.findByAccountIdAndFestivalEventId(accountId, festivalId)
                .orElseThrow(() -> new ValidationException("Configure festival coupons before generating them"));
        User generator = user(userId); Map<Long, FestivalCouponEntitlement> overrides = entitlements.findByAccountIdAndFestivalEventId(accountId, festivalId).stream()
                .collect(Collectors.toMap(x -> x.getFestivalCollection().getId(), Function.identity()));
        int eligible = 0, created = 0, existing = 0, skipped = 0;
        for (FestivalCollection collection : collections.findByAccountIdAndFestivalEventId(accountId, festivalId)) {
            if (!eligible(collection)) { skipped++; continue; }
            eligible++; FestivalCouponEntitlement override = overrides.get(collection.getId());
            int count = override != null && override.getCouponCountOverride() != null ? override.getCouponCountOverride() : setting.getDefaultCouponCount();
            List<FestivalCoupon> issued = coupons.findByAccountIdAndFestivalCollectionIdOrderBySequenceNumberAsc(accountId, collection.getId());
            int live = (int) issued.stream().filter(x -> x.getStatus() != FestivalCouponStatus.CANCELLED).count();
            existing += live;
            int nextSequence = issued.stream().mapToInt(FestivalCoupon::getSequenceNumber).max().orElse(0) + 1;
            for (int missing = live; missing < count; missing++) {
                int sequence = nextSequence++;
                coupons.save(FestivalCoupon.builder().account(collection.getAccount()).festivalEvent(festival).festivalCollection(collection).flat(collection.getFlat())
                        .couponNumber(number(accountId, festivalId, collection.getFlat().getId(), sequence)).sequenceNumber(sequence).generatedBy(generator).build());
                created++;
            }
        }
        setting.setGenerationStatus(FestivalCouponGenerationStatus.GENERATED); settings.save(setting);
        return GenerationResult.builder().eligibleFlats(eligible).createdCoupons(created).existingCoupons(existing).skippedFlats(skipped).build();
    }

    @Transactional
    public Coupon cancel(Long accountId, Long userId, Long festivalId, Long couponId) {
        requireAdmin(accountId, userId); festival(accountId, festivalId);
        FestivalCoupon coupon = coupons.findByAccountIdAndId(accountId, couponId).filter(x -> x.getFestivalEvent().getId().equals(festivalId))
                .orElseThrow(() -> new ResourceNotFoundException("Festival coupon not found"));
        if (coupon.getStatus() == FestivalCouponStatus.USED) throw new ValidationException("A used coupon cannot be cancelled");
        coupon.setStatus(FestivalCouponStatus.CANCELLED); coupon.setCancelledAt(LocalDateTime.now()); return map(coupons.save(coupon));
    }

    @Transactional(readOnly = true)
    public List<FestivalCoupon> printable(Long accountId, Long userId, Long festivalId) {
        festival(accountId, festivalId); Access access = access(accountId, userId);
        return coupons.findByAccountIdAndFestivalEventIdOrderByFlatBlockNameAscFlatFlatNumberAscSequenceNumberAsc(accountId, festivalId).stream()
                .filter(x -> visible(access, x.getFlat()) && x.getStatus() != FestivalCouponStatus.CANCELLED).toList();
    }

    @Transactional(readOnly = true)
    public List<Coupon> list(Long accountId, Long userId, Long festivalId) {
        festival(accountId, festivalId); Access access = access(accountId, userId);
        return coupons.findByAccountIdAndFestivalEventIdOrderByFlatBlockNameAscFlatFlatNumberAscSequenceNumberAsc(accountId, festivalId).stream()
                .filter(x -> visible(access, x.getFlat())).map(this::map).toList();
    }

    private Eligibility eligibility(FestivalCollection c, FestivalCouponSetting s, FestivalCouponEntitlement e, List<FestivalCoupon> issued) {
        boolean qualifies = eligible(c); int effective = e != null && e.getCouponCountOverride() != null ? e.getCouponCountOverride() : s == null ? 0 : s.getDefaultCouponCount();
        long active = issued.stream().filter(x -> x.getStatus() == FestivalCouponStatus.ACTIVE).count();
        long used = issued.stream().filter(x -> x.getStatus() == FestivalCouponStatus.USED).count();
        return Eligibility.builder().collectionId(c.getId()).flatId(c.getFlat().getId()).blockName(c.getFlat().getBlockName()).flatNumber(c.getFlat().getFlatNumber())
                .ownerName(c.getFlat().getOwnerName()).expectedAmount(c.getExpectedAmount()).collectedAmount(c.getCollectedAmount()).paymentStatus(c.getPaymentStatus())
                .eligible(qualifies).couponCountOverride(e == null ? null : e.getCouponCountOverride()).effectiveCouponCount(effective).generatedCount((long) issued.size())
                .activeCount(active).usedCount(used).discrepancy(!issued.isEmpty() && (!qualifies || active + used != effective)).build();
    }
    private boolean eligible(FestivalCollection c) { return c.getCollectedAmount() != null && c.getExpectedAmount() != null && c.getCollectedAmount().compareTo(c.getExpectedAmount()) >= 0; }
    private String number(Long accountId, Long festivalId, Long flatId, int sequence) { return "FC-" + accountId + "-" + festivalId + "-" + flatId + "-" + String.format("%03d", sequence); }
    private Settings map(FestivalCouponSetting s, Long festivalId) { return s == null ? null : Settings.builder().id(s.getId()).festivalEventId(festivalId).couponName(s.getCouponName()).defaultCouponCount(s.getDefaultCouponCount()).generationStatus(s.getGenerationStatus()).build(); }
    private Coupon map(FestivalCoupon c) { return Coupon.builder().id(c.getId()).collectionId(c.getFestivalCollection().getId()).flatId(c.getFlat().getId()).blockName(c.getFlat().getBlockName()).flatNumber(c.getFlat().getFlatNumber()).ownerName(c.getFlat().getOwnerName()).couponName(c.getFestivalEvent().getFestivalName()).couponNumber(c.getCouponNumber()).sequenceNumber(c.getSequenceNumber()).status(c.getStatus()).generatedAt(c.getGeneratedAt()).usedAt(c.getUsedAt()).cancelledAt(c.getCancelledAt()).build(); }
    private FestivalEvent festival(Long a, Long f) { return festivals.findByAccountIdAndIdAndDeletedAtIsNull(a, f).orElseThrow(() -> new ResourceNotFoundException("Festival event not found")); }
    private Account account(Long id) { return accounts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Account not found")); }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found")); }
    private Access access(Long a, Long u) { Account account = account(a); if (account.getUser().getId().equals(u)) return new Access(account.getRole(), null, null); return memberships.findByAccountIdAndUserIdAndActiveTrue(a, u).map(m -> new Access(m.getRole(), m.getRequestedBlockName(), m.getRequestedFlatNumber())).orElseThrow(() -> new ValidationException("An active society membership is required")); }
    private void requireAdmin(Long a, Long u) { if (access(a, u).role() != UserRole.ADMIN) throw new ValidationException("Only society admins can manage festival coupons"); }
    private boolean visible(Access a, Flat f) { if (a.role() == UserRole.BLOCK_REPRESENTATIVE) return eq(f.getBlockName(), a.block()); if (a.role() == UserRole.MEMBER) return eq(f.getBlockName(), a.block()) && eq(f.getFlatNumber(), a.flat()); return true; }
    private boolean eq(String a, String b) { return a != null && b != null && a.equalsIgnoreCase(b); }
    private record Access(UserRole role, String block, String flat) {}
}
