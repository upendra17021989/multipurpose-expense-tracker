package com.app.service;

import com.app.dto.SportsDtos.*;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class SportsService {
    private final AccountRepository accountRepository;
    private final SportsMemberRepository memberRepository;
    private final SportsEventRepository eventRepository;
    private final SportsExpenseRepository expenseRepository;
    private final SportsCollectionRepository collectionRepository;
    private final SportsCollectionReceiptRepository receiptRepository;
    private final UserRepository userRepository;
    private final AccountUserMembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public SportsService(AccountRepository accountRepository, SportsMemberRepository memberRepository,
                         SportsEventRepository eventRepository, SportsExpenseRepository expenseRepository,
                         SportsCollectionRepository collectionRepository,
                         SportsCollectionReceiptRepository receiptRepository,
                         UserRepository userRepository, AccountUserMembershipRepository membershipRepository,
                         PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.memberRepository = memberRepository;
        this.eventRepository = eventRepository;
        this.expenseRepository = expenseRepository;
        this.collectionRepository = collectionRepository;
        this.receiptRepository = receiptRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<MemberDto> getMembers(Long accountId) {
        requireSportsAccount(accountId);
        return memberRepository.findByAccountIdAndActiveTrue(accountId).stream().map(this::mapMember).collect(Collectors.toList());
    }

    public MemberDto getMember(Long accountId, Long memberId) {
        requireSportsAccount(accountId);
        return mapMember(findMember(accountId, memberId));
    }

    public MemberDto createMember(Long accountId, MemberRequest request) {
        Account account = requireSportsAccount(accountId);
        String mobile = trimToNull(request.getMobile());
        SportsMember saved = memberRepository.save(SportsMember.builder()
                .account(account)
                .memberName(request.getMemberName().trim())
                .mobile(mobile)
                .email(trimToNull(request.getEmail()))
                .role(trimToNull(request.getRole()))
                .active(true)
                .build());
        String generatedPassword = mobile != null ? ensureMemberLogin(account, saved, request) : null;
        MemberDto dto = mapMember(saved);
        dto.setDefaultPassword(generatedPassword);
        return dto;
    }

    public MemberDto updateMember(Long accountId, Long memberId, MemberRequest request) {
        requireSportsAccount(accountId);
        SportsMember member = findMember(accountId, memberId);
        member.setMemberName(request.getMemberName().trim());
        member.setMobile(trimToNull(request.getMobile()));
        member.setEmail(trimToNull(request.getEmail()));
        member.setRole(trimToNull(request.getRole()));
        return mapMember(memberRepository.save(member));
    }

    public void deleteMember(Long accountId, Long memberId) {
        requireSportsAccount(accountId);
        SportsMember member = findMember(accountId, memberId);
        member.setActive(false);
        memberRepository.save(member);
    }

    public List<EventDto> getEvents(Long accountId, Integer year) {
        requireSportsAccount(accountId);
        List<SportsEvent> events = year != null ? eventRepository.findByAccountIdAndYear(accountId, year) : eventRepository.findByAccountId(accountId);
        return events.stream().map(this::mapEvent).collect(Collectors.toList());
    }

    public EventDto getEvent(Long accountId, Long eventId) {
        requireSportsAccount(accountId);
        return mapEvent(findEvent(accountId, eventId));
    }

    public EventDto createEvent(Long accountId, Long userId, EventRequest request) {
        Account account = requireSportsAccount(accountId);
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateEvent(request);
        SportsEvent saved = eventRepository.save(SportsEvent.builder()
                .account(account)
                .owner(owner)
                .eventName(request.getEventName().trim())
                .year(request.getYear())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .budgetAmount(request.getBudgetAmount())
                .collectedAmount(BigDecimal.ZERO)
                .totalExpense(BigDecimal.ZERO)
                .status(SportsEventStatus.PLANNED)
                .build());
        return mapEvent(saved);
    }

    public EventDto updateEvent(Long accountId, Long eventId, EventRequest request) {
        requireSportsAccount(accountId);
        validateEvent(request);
        SportsEvent event = findEvent(accountId, eventId);
        event.setEventName(request.getEventName().trim());
        event.setYear(request.getYear());
        event.setStartDate(request.getStartDate());
        event.setEndDate(request.getEndDate());
        event.setBudgetAmount(request.getBudgetAmount());
        return mapEvent(eventRepository.save(event));
    }

    public EventDto updateEventStatus(Long accountId, Long eventId, StatusRequest request) {
        requireSportsAccount(accountId);
        SportsEvent event = findEvent(accountId, eventId);
        event.setStatus(request.getStatus());
        return mapEvent(eventRepository.save(event));
    }

    public void deleteEvent(Long accountId, Long eventId) {
        requireSportsAccount(accountId);
        eventRepository.delete(findEvent(accountId, eventId));
    }

    public List<ExpenseDto> getExpenses(Long accountId) {
        requireSportsAccount(accountId);
        return expenseRepository.findByAccountIdAndSoftDeletedFalse(accountId).stream().map(this::mapExpense).collect(Collectors.toList());
    }

    public ExpenseDto getExpense(Long accountId, Long expenseId) {
        requireSportsAccount(accountId);
        return mapExpense(findExpense(accountId, expenseId));
    }

    public ExpenseDto createExpense(Long accountId, ExpenseRequest request) {
        Account account = requireSportsAccount(accountId);
        validatePayment(request.getPaymentMode(), request.getUtr(), request.getChequeNumber());
        SportsEvent event = request.getSportsEventId() != null ? findEvent(accountId, request.getSportsEventId()) : null;
        SportsExpense saved = expenseRepository.save(SportsExpense.builder()
                .account(account)
                .sportsEvent(event)
                .expenseDate(request.getExpenseDate())
                .category(request.getCategory().trim())
                .vendorName(trimToNull(request.getVendorName()))
                .description(trimToNull(request.getDescription()))
                .amount(request.getAmount())
                .paymentMode(request.getPaymentMode())
                .transactionId(trimToNull(request.getTransactionId()))
                .utr(trimToNull(request.getUtr()))
                .chequeNumber(trimToNull(request.getChequeNumber()))
                .remarks(trimToNull(request.getRemarks()))
                .status(request.getStatus() != null ? request.getStatus() : ExpenseStatus.DRAFT)
                .softDeleted(false)
                .build());
        refreshEventExpenseTotal(event);
        return mapExpense(saved);
    }

    public ExpenseDto updateExpense(Long accountId, Long expenseId, ExpenseRequest request) {
        requireSportsAccount(accountId);
        validatePayment(request.getPaymentMode(), request.getUtr(), request.getChequeNumber());
        SportsExpense expense = findExpense(accountId, expenseId);
        SportsEvent previousEvent = expense.getSportsEvent();
        SportsEvent event = request.getSportsEventId() != null ? findEvent(accountId, request.getSportsEventId()) : null;
        expense.setSportsEvent(event);
        expense.setExpenseDate(request.getExpenseDate());
        expense.setCategory(request.getCategory().trim());
        expense.setVendorName(trimToNull(request.getVendorName()));
        expense.setDescription(trimToNull(request.getDescription()));
        expense.setAmount(request.getAmount());
        expense.setPaymentMode(request.getPaymentMode());
        expense.setTransactionId(trimToNull(request.getTransactionId()));
        expense.setUtr(trimToNull(request.getUtr()));
        expense.setChequeNumber(trimToNull(request.getChequeNumber()));
        expense.setRemarks(trimToNull(request.getRemarks()));
        expense.setStatus(request.getStatus() != null ? request.getStatus() : expense.getStatus());
        SportsExpense saved = expenseRepository.save(expense);
        refreshEventExpenseTotal(previousEvent);
        refreshEventExpenseTotal(event);
        return mapExpense(saved);
    }

    public void deleteExpense(Long accountId, Long expenseId) {
        requireSportsAccount(accountId);
        SportsExpense expense = findExpense(accountId, expenseId);
        SportsEvent event = expense.getSportsEvent();
        expense.setSoftDeleted(true);
        expenseRepository.save(expense);
        refreshEventExpenseTotal(event);
    }

    public List<CollectionDto> getCollections(Long accountId, Long eventId) {
        requireSportsAccount(accountId);
        return collectionRepository.findByAccountIdAndSportsEventId(accountId, eventId).stream().map(this::mapCollection).collect(Collectors.toList());
    }

    public CollectionSummaryDto getCollectionSummary(Long accountId, Long eventId) {
        List<SportsCollection> collections = collectionRepository.findByAccountIdAndSportsEventId(accountId, eventId);
        BigDecimal expected = BigDecimal.ZERO;
        BigDecimal collected = BigDecimal.ZERO;
        BigDecimal opening = BigDecimal.ZERO;
        BigDecimal openingDue = BigDecimal.ZERO;
        BigDecimal pending = BigDecimal.ZERO;
        BigDecimal excess = BigDecimal.ZERO;
        BigDecimal refunded = BigDecimal.ZERO;
        long paid = 0, pendingCount = 0, partial = 0, excessCount = 0;
        for (SportsCollection collection : collections) {
            expected = expected.add(nonNull(collection.getExpectedAmount()));
            collected = collected.add(nonNull(collection.getCollectedAmount()));
            opening = opening.add(nonNull(collection.getOpeningBalance()));
            openingDue = openingDue.add(nonNull(collection.getOpeningDue()));
            pending = pending.add(nonNull(collection.getPendingAmount()));
            excess = excess.add(nonNull(collection.getExcessAmount()));
            refunded = refunded.add(nonNull(collection.getRefundedAmount()));
            if (collection.getPaymentStatus() == PaymentStatus.PAID) paid++;
            if (collection.getPaymentStatus() == PaymentStatus.PENDING) pendingCount++;
            if (collection.getPaymentStatus() == PaymentStatus.PARTIAL) partial++;
            if (collection.getPaymentStatus() == PaymentStatus.EXCESS) excessCount++;
        }
        return CollectionSummaryDto.builder().sportsEventId(eventId).totalExpected(expected).totalCollected(collected).totalOpeningBalance(opening).totalOpeningDue(openingDue)
                .totalPending(pending).totalExcess(excess).totalRefunded(refunded).paidMembers(paid)
                .pendingMembers(pendingCount).partialMembers(partial).excessMembers(excessCount).totalMembers(collections.size()).build();
    }

    public List<CollectionDto> generateDemand(Long accountId, DemandRequest request) {
        Account account = requireSportsAccount(accountId);
        SportsEvent event = findEvent(accountId, request.getSportsEventId());
        List<SportsMember> members = memberRepository.findByAccountIdAndActiveTrue(accountId);
        if (request.getSportsMemberIds() != null && !request.getSportsMemberIds().isEmpty()) {
            members = members.stream()
                    .filter(member -> request.getSportsMemberIds().contains(member.getId()))
                    .collect(Collectors.toList());
        }
        if (members.isEmpty()) throw new ValidationException("Select at least one active sports member before generating collection demand");
        for (SportsMember member : members) {
            Optional<SportsCollection> existing = collectionRepository.findByAccountIdAndSportsEventIdAndSportsMemberId(accountId, event.getId(), member.getId());
            SportsCollection collection = existing.orElseGet(() -> SportsCollection.builder().account(account).sportsEvent(event).sportsMember(member)
                    .collectedAmount(BigDecimal.ZERO).openingBalance(BigDecimal.ZERO).openingDue(BigDecimal.ZERO).excessAmount(BigDecimal.ZERO)
                    .carriedForwardAmount(BigDecimal.ZERO).carriedForwardPendingAmount(BigDecimal.ZERO).refundedAmount(BigDecimal.ZERO).build());
            if (nonNull(collection.getOpeningBalance()).compareTo(BigDecimal.ZERO) == 0
                    && nonNull(collection.getOpeningDue()).compareTo(BigDecimal.ZERO) == 0) {
                applyOpeningBalance(accountId, event, member, collection);
            }
            collection.setExpectedAmount(request.getExpectedAmount());
            collection.setRemarks(trimToNull(request.getRemarks()));
            recalculateCollection(collection);
            collectionRepository.save(collection);
        }
        refreshEventCollectedAmount(event);
        return getCollections(accountId, event.getId());
    }

    public CollectionDto updateDemand(Long accountId, Long collectionId, DemandRequest request) {
        requireSportsAccount(accountId);
        SportsCollection collection = findCollection(accountId, collectionId);
        collection.setExpectedAmount(request.getExpectedAmount());
        collection.setRemarks(trimToNull(request.getRemarks()));
        recalculateCollection(collection);
        SportsCollection saved = collectionRepository.save(collection);
        refreshEventCollectedAmount(saved.getSportsEvent());
        return mapCollection(saved);
    }

    public void deleteDemand(Long accountId, Long collectionId) {
        requireSportsAccount(accountId);
        SportsCollection collection = findCollection(accountId, collectionId);
        if (nonNull(collection.getOpeningBalance()).compareTo(BigDecimal.ZERO) > 0 || nonNull(collection.getOpeningDue()).compareTo(BigDecimal.ZERO) > 0) {
            throw new ValidationException("Cannot delete a demand that contains a carried-forward opening balance or due");
        }
        if (nonNull(collection.getCollectedAmount()).compareTo(BigDecimal.ZERO) > 0
                || !receiptRepository.findBySportsCollectionId(collectionId).isEmpty()) {
            throw new ValidationException("Cannot delete demand after payment has been collected");
        }
        SportsEvent event = collection.getSportsEvent();
        collectionRepository.delete(collection);
        refreshEventCollectedAmount(event);
    }

    public ReceiptDto addPayment(Long accountId, Long collectionId, PaymentRequest request) {
        requireSportsAccount(accountId);
        validatePayment(request.getPaymentMode(), request.getUtr(), request.getChequeNumber());
        SportsCollection collection = findCollection(accountId, collectionId);
        if (nonNull(collection.getCarriedForwardPendingAmount()).compareTo(BigDecimal.ZERO) > 0) {
            throw new ValidationException("This pending amount was carried to a later event; record payment against the latest event");
        }
        SportsCollectionReceipt receipt = SportsCollectionReceipt.builder()
                .sportsCollection(collection)
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
        SportsCollectionReceipt saved = receiptRepository.save(receipt);
        refreshEventCollectedAmount(collection.getSportsEvent());
        return mapReceipt(saved);
    }


    public ReceiptDto voidReceipt(Long accountId, Long receiptId, VoidReceiptRequest request) {
        requireSportsAccount(accountId);
        SportsCollectionReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new ResourceNotFoundException("Sports receipt not found"));
        SportsCollection collection = receipt.getSportsCollection();
        if (!collection.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Sports receipt not found");
        }
        if (receipt.getStatus() == ReceiptStatus.VOIDED) {
            throw new ValidationException("Receipt is already voided");
        }
        if (nonNull(collection.getCarriedForwardAmount()).compareTo(BigDecimal.ZERO) > 0 || nonNull(collection.getCarriedForwardPendingAmount()).compareTo(BigDecimal.ZERO) > 0) {
            throw new ValidationException("Cannot void payment after the balance has been carried to another event");
        }
        receipt.setStatus(ReceiptStatus.VOIDED);
        receipt.setVoidReason(trimToNull(request.getVoidReason()));
        receipt.setVoidedAt(LocalDateTime.now());
        SportsCollectionReceipt saved = receiptRepository.save(receipt);
        recalculateCollectionFromReceipts(collection);
        collectionRepository.save(collection);
        refreshEventCollectedAmount(collection.getSportsEvent());
        return mapReceipt(saved);
    }
    public List<ReceiptDto> getReceipts(Long accountId, Long collectionId) {
        requireSportsAccount(accountId);
        findCollection(accountId, collectionId);
        return receiptRepository.findBySportsCollectionId(collectionId).stream().map(this::mapReceipt).collect(Collectors.toList());
    }



    public List<MemberLoginDto> generateMissingMemberLogins(Long accountId) {
        Account account = requireSportsAccount(accountId);
        return memberRepository.findByAccountIdAndActiveTrue(accountId).stream()
                .filter(member -> trimToNull(member.getMobile()) != null)
                .map(member -> generateMemberLogin(account, member))
                .collect(Collectors.toList());
    }

    private MemberLoginDto generateMemberLogin(Account account, SportsMember member) {
        String mobile = trimToNull(member.getMobile());
        UserRole loginRole = resolveSportsLoginRole(member.getRole());
        User existingUser = userRepository.findByMobile(mobile).orElse(null);
        if (existingUser != null) {
            AccountUserMembership membership = membershipRepository.findByAccountIdAndUserIdAndActiveTrue(account.getId(), existingUser.getId())
                    .orElse(AccountUserMembership.builder().account(account).user(existingUser).active(true).build());
            membership.setRole(loginRole);
            membershipRepository.save(membership);
            return MemberLoginDto.builder()
                    .sportsMemberId(member.getId())
                    .memberName(member.getMemberName())
                    .mobile(mobile)
                    .role(loginRole.name())
                    .created(false)
                    .message("Existing user linked. Use existing password.")
                    .build();
        }

        String generatedPassword = generateDefaultPassword();
        User user = userRepository.save(User.builder()
                .name(member.getMemberName())
                .mobile(mobile)
                .email(trimToNull(member.getEmail()))
                .passwordHash(passwordEncoder.encode(generatedPassword))
                .active(true)
                .build());
        membershipRepository.save(AccountUserMembership.builder()
                .account(account)
                .user(user)
                .role(loginRole)
                .active(true)
                .build());
        return MemberLoginDto.builder()
                .sportsMemberId(member.getId())
                .memberName(member.getMemberName())
                .mobile(mobile)
                .role(loginRole.name())
                .defaultPassword(generatedPassword)
                .created(true)
                .message("Login created")
                .build();
    }
    public void requireSportsAdmin(Long accountId, Long userId) {
        Account account = requireSportsAccount(accountId);
        if (account.getUser().getId().equals(userId) && (account.getRole() == UserRole.OWNER || account.getRole() == UserRole.ADMIN)) {
            return;
        }
        UserRole role = membershipRepository.findByAccountIdAndUserIdAndActiveTrue(accountId, userId)
                .map(AccountUserMembership::getRole)
                .orElse(null);
        if (role != UserRole.OWNER && role != UserRole.ADMIN && role != UserRole.TREASURER) {
            throw new ValidationException("Only sports admins can perform this action");
        }
    }

    public UserRole getSportsRole(Long accountId, Long userId) {
        Account account = requireSportsAccount(accountId);
        if (account.getUser().getId().equals(userId)) return account.getRole();
        return membershipRepository.findByAccountIdAndUserIdAndActiveTrue(accountId, userId)
                .map(AccountUserMembership::getRole)
                .orElse(UserRole.MEMBER);
    }

    private String ensureMemberLogin(Account account, SportsMember member, MemberRequest request) {
        String mobile = member.getMobile();
        UserRole loginRole = resolveSportsLoginRole(request.getRole());
        final String[] generatedPassword = { null };
        User user = userRepository.findByMobile(mobile).orElseGet(() -> {
            generatedPassword[0] = generateDefaultPassword();
            return userRepository.save(User.builder()
                    .name(member.getMemberName())
                    .mobile(mobile)
                    .email(trimToNull(member.getEmail()))
                    .passwordHash(passwordEncoder.encode(generatedPassword[0]))
                    .active(true)
                    .build());
        });
        AccountUserMembership membership = membershipRepository.findByAccountIdAndUserIdAndActiveTrue(account.getId(), user.getId())
                .orElse(AccountUserMembership.builder().account(account).user(user).active(true).build());
        membership.setRole(loginRole);
        membershipRepository.save(membership);
        return generatedPassword[0];
    }

    private UserRole resolveSportsLoginRole(String role) {
        if (role != null && role.trim().equalsIgnoreCase("ADMIN")) return UserRole.ADMIN;
        if (role != null && role.trim().equalsIgnoreCase("TREASURER")) return UserRole.TREASURER;
        return UserRole.MEMBER;
    }

    private String generateDefaultPassword() {
        StringBuilder password = new StringBuilder("SP-");
        for (int i = 0; i < 8; i++) {
            password.append(PASSWORD_CHARS.charAt(RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return password.toString();
    }
    private Account requireSportsAccount(Long accountId) {
        Account account = accountRepository.findById(accountId).orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        if (account.getAccountType() != AccountType.SPORTS) throw new ValidationException("Sports module is available only for sports accounts");
        return account;
    }

    private SportsMember findMember(Long accountId, Long id) { return memberRepository.findByAccountIdAndIdAndActiveTrue(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Sports member not found")); }
    private SportsEvent findEvent(Long accountId, Long id) { return eventRepository.findByAccountIdAndId(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Sports event not found")); }
    private SportsExpense findExpense(Long accountId, Long id) { return expenseRepository.findByAccountIdAndIdAndSoftDeletedFalse(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Sports expense not found")); }
    private SportsCollection findCollection(Long accountId, Long id) { return collectionRepository.findByAccountIdAndId(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Sports collection not found")); }

    private void validateEvent(EventRequest request) {
        if (request.getEndDate().isBefore(request.getStartDate())) throw new ValidationException("End date cannot be before start date");
        if (request.getBudgetAmount() != null && request.getBudgetAmount().compareTo(BigDecimal.ZERO) < 0) throw new ValidationException("Budget amount must be zero or greater");
    }

    private void validatePayment(PaymentMode mode, String utr, String chequeNumber) {
        if ((mode == PaymentMode.UPI || mode == PaymentMode.NEFT) && (utr == null || utr.isBlank())) throw new ValidationException("UTR is required for UPI/NEFT payments");
        if (mode == PaymentMode.CHEQUE && (chequeNumber == null || chequeNumber.isBlank())) throw new ValidationException("Cheque number is required for cheque payments");
    }


    private void recalculateCollectionFromReceipts(SportsCollection collection) {
        BigDecimal collected = receiptRepository.findBySportsCollectionIdAndStatus(collection.getId(), ReceiptStatus.ACTIVE).stream()
                .map(receipt -> nonNull(receipt.getAmountPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        collection.setCollectedAmount(collected);
        recalculateCollection(collection);
    }
    private void recalculateCollection(SportsCollection collection) {
        BigDecimal expected = nonNull(collection.getExpectedAmount()).add(nonNull(collection.getOpeningDue()));
        BigDecimal collected = nonNull(collection.getCollectedAmount());
        BigDecimal available = collected.add(nonNull(collection.getOpeningBalance()));
        collection.setPendingAmount(expected.subtract(available).max(BigDecimal.ZERO));
        collection.setExcessAmount(available.subtract(expected).max(BigDecimal.ZERO));
        collection.setUpdatedAt(LocalDateTime.now());
        if (available.compareTo(BigDecimal.ZERO) == 0) collection.setPaymentStatus(PaymentStatus.PENDING);
        else if (available.compareTo(expected) < 0) collection.setPaymentStatus(PaymentStatus.PARTIAL);
        else if (available.compareTo(expected) == 0) collection.setPaymentStatus(PaymentStatus.PAID);
        else collection.setPaymentStatus(PaymentStatus.EXCESS);
    }

    private void applyOpeningBalance(Long accountId, SportsEvent event, SportsMember member, SportsCollection destination) {
        for (SportsCollection source : collectionRepository.findPriorCollections(accountId, member.getId(), event.getStartDate(), event.getId())) {
            BigDecimal credit = nonNull(source.getExcessAmount()).subtract(nonNull(source.getCarriedForwardAmount())).max(BigDecimal.ZERO);
            BigDecimal due = nonNull(source.getPendingAmount()).subtract(nonNull(source.getCarriedForwardPendingAmount())).max(BigDecimal.ZERO);
            if (credit.compareTo(BigDecimal.ZERO) <= 0 && due.compareTo(BigDecimal.ZERO) <= 0) continue;
            destination.setOpeningBalance(credit);
            destination.setOpeningDue(due);
            source.setCarriedForwardAmount(nonNull(source.getCarriedForwardAmount()).add(credit));
            source.setCarriedForwardPendingAmount(nonNull(source.getCarriedForwardPendingAmount()).add(due));
            source.setUpdatedAt(LocalDateTime.now());
            collectionRepository.save(source);
            break;
        }
    }

    private void refreshEventCollectedAmount(SportsEvent event) {
        BigDecimal total = collectionRepository.findByAccountIdAndSportsEventId(event.getAccount().getId(), event.getId()).stream()
                .map(SportsCollection::getCollectedAmount).map(this::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        event.setCollectedAmount(total);
        eventRepository.save(event);
    }

    private void refreshEventExpenseTotal(SportsEvent event) {
        if (event == null) return;
        BigDecimal total = expenseRepository.findByAccountIdAndSportsEventIdAndSoftDeletedFalse(event.getAccount().getId(), event.getId()).stream()
                .map(SportsExpense::getAmount).map(this::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        event.setTotalExpense(total);
        eventRepository.save(event);
    }

    private String buildReceiptNumber(SportsCollection collection) {
        long count = receiptRepository.findBySportsCollectionId(collection.getId()).size() + 1L;
        return "SPORT-" + collection.getSportsEvent().getId() + "-" + collection.getSportsMember().getId() + "-" + count;
    }

    private MemberDto mapMember(SportsMember member) { return MemberDto.builder().id(member.getId()).accountId(member.getAccount().getId()).memberName(member.getMemberName()).mobile(member.getMobile()).email(member.getEmail()).role(member.getRole()).active(member.getActive()).createdAt(member.getCreatedAt()).build(); }
    private EventDto mapEvent(SportsEvent event) { User owner = event.getOwner(); return EventDto.builder().id(event.getId()).accountId(event.getAccount().getId()).ownerUserId(owner != null ? owner.getId() : null).ownerName(owner != null ? owner.getName() : null).eventName(event.getEventName()).year(event.getYear()).startDate(event.getStartDate()).endDate(event.getEndDate()).budgetAmount(event.getBudgetAmount()).collectedAmount(event.getCollectedAmount()).totalExpense(event.getTotalExpense()).balanceAmount(event.getBalanceAmount()).status(event.getStatus()).createdAt(event.getCreatedAt()).build(); }
    private ExpenseDto mapExpense(SportsExpense expense) { SportsEvent event = expense.getSportsEvent(); return ExpenseDto.builder().id(expense.getId()).accountId(expense.getAccount().getId()).sportsEventId(event != null ? event.getId() : null).eventName(event != null ? event.getEventName() : null).expenseDate(expense.getExpenseDate()).category(expense.getCategory()).vendorName(expense.getVendorName()).description(expense.getDescription()).amount(expense.getAmount()).paymentMode(expense.getPaymentMode()).transactionId(expense.getTransactionId()).utr(expense.getUtr()).chequeNumber(expense.getChequeNumber()).remarks(expense.getRemarks()).status(expense.getStatus()).createdAt(expense.getCreatedAt()).build(); }
    private CollectionDto mapCollection(SportsCollection collection) { SportsMember member = collection.getSportsMember(); SportsEvent event = collection.getSportsEvent(); return CollectionDto.builder().id(collection.getId()).accountId(collection.getAccount().getId()).sportsEventId(event.getId()).eventName(event.getEventName()).sportsMemberId(member.getId()).memberName(member.getMemberName()).mobile(member.getMobile()).expectedAmount(collection.getExpectedAmount()).collectedAmount(collection.getCollectedAmount()).openingBalance(collection.getOpeningBalance()).openingDue(collection.getOpeningDue()).pendingAmount(collection.getPendingAmount()).excessAmount(collection.getExcessAmount()).carriedForwardAmount(collection.getCarriedForwardAmount()).carriedForwardPendingAmount(collection.getCarriedForwardPendingAmount()).refundedAmount(collection.getRefundedAmount()).paymentStatus(collection.getPaymentStatus()).remarks(collection.getRemarks()).createdAt(collection.getCreatedAt()).updatedAt(collection.getUpdatedAt()).build(); }
    private ReceiptDto mapReceipt(SportsCollectionReceipt receipt) { return ReceiptDto.builder().id(receipt.getId()).sportsCollectionId(receipt.getSportsCollection().getId()).paymentDate(receipt.getPaymentDate()).amountPaid(receipt.getAmountPaid()).paymentMode(receipt.getPaymentMode()).transactionId(receipt.getTransactionId()).utr(receipt.getUtr()).chequeNumber(receipt.getChequeNumber()).collectedBy(receipt.getCollectedBy()).receiptNumber(receipt.getReceiptNumber()).remarks(receipt.getRemarks()).status(receipt.getStatus()).voidReason(receipt.getVoidReason()).voidedAt(receipt.getVoidedAt()).createdAt(receipt.getCreatedAt()).build(); }
    private BigDecimal nonNull(BigDecimal amount) { return amount != null ? amount : BigDecimal.ZERO; }
    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}





