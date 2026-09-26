package com.app.service;

import static java.util.stream.Collectors.*;

import com.app.dto.SharedExpenseDtos.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import java.math.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SharedExpenseService {
  private final SharedExpenseGroupRepository groups;
  private final SharedGroupMemberRepository members;
  private final SharedExpenseRepository expenses;
  private final SharedExpensePayerRepository payers;
  private final SharedExpenseShareRepository shares;
  private final SharedExpenseItemRepository items;
  private final SharedSettlementRepository settlements;
  private final SharedExpenseActivityRepository activities;
  private final AccountRepository accounts;
  private final UserRepository users;
  private final SharedInvitationService invitationService;

  public List<GroupDto> list(Long accountId, Long userId) {
    List<SharedExpenseGroup> accessible = groups.findAccessibleIncludingArchived(accountId, userId);
    if (accessible.isEmpty()) return List.of();
    Map<Long, List<SharedGroupMember>> membersByGroup = members.findByGroupIdInOrderByMemberName(
        accessible.stream().map(SharedExpenseGroup::getId).toList()).stream()
        .collect(groupingBy(m -> m.getGroup().getId()));
    return accessible.stream()
        .map(g -> map(g, false, membersByGroup.getOrDefault(g.getId(), List.of())))
        .toList();
  }

  public GroupDto get(Long accountId, Long userId, Long id) {
    return map(
        groups
            .findAccessibleById(id, accountId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Shared expense group not found")),
        true);
  }

  public List<FriendBalanceDto> friends(Long accountId, Long userId) {
    Map<Long, FriendAccumulator> result = new LinkedHashMap<>();
    List<SharedExpenseGroup> accessible = groups.findAccessible(accountId, userId);
    if (accessible.isEmpty()) return List.of();
    List<Long> groupIds = accessible.stream().map(SharedExpenseGroup::getId).toList();
    Map<Long, List<SharedGroupMember>> membersByGroup = members.findByGroupIdInOrderByMemberName(groupIds).stream()
        .collect(groupingBy(m -> m.getGroup().getId()));
    Map<Long, List<SharedExpensePayer>> payersByGroup = payers.findByExpenseGroupIdInAndExpenseReversedFalse(groupIds).stream()
        .collect(groupingBy(p -> p.getExpense().getGroup().getId()));
    Map<Long, List<SharedExpenseShare>> sharesByGroup = shares.findByExpenseGroupIdInAndExpenseReversedFalse(groupIds).stream()
        .collect(groupingBy(s -> s.getExpense().getGroup().getId()));
    Map<Long, List<SharedSettlement>> settlementsByGroup = settlements.findByGroupIdInAndReversedFalse(groupIds).stream()
        .collect(groupingBy(s -> s.getGroup().getId()));
    for (SharedExpenseGroup g : accessible) {
      List<SharedGroupMember> groupMembers = membersByGroup.getOrDefault(g.getId(), List.of());
      if (groupMembers.stream()
          .noneMatch(m -> m.getUser() != null && m.getUser().getId().equals(userId))) continue;
      Map<Long, BigDecimal> balances = calculateBalances(groupMembers,
          payersByGroup.getOrDefault(g.getId(), List.of()), sharesByGroup.getOrDefault(g.getId(), List.of()),
          settlementsByGroup.getOrDefault(g.getId(), List.of()));
      for (SharedGroupMember m : groupMembers) {
        if (m.getUser() == null || m.getUser().getId().equals(userId) || !m.getActive()) continue;
        FriendAccumulator a =
            result.computeIfAbsent(m.getUser().getId(), id -> new FriendAccumulator(m.getUser()));
        a.sharedGroups++;
        a.balance = a.balance.add(balances.getOrDefault(m.getId(), BigDecimal.ZERO));
      }
    }
    return result.values().stream()
        .map(
            a ->
                FriendBalanceDto.builder()
                    .userId(a.user.getId())
                    .name(a.user.getName())
                    .email(a.user.getEmail())
                    .mobile(a.user.getMobile())
                    .sharedGroups(a.sharedGroups)
                    .balance(a.balance)
                    .build())
        .sorted(Comparator.comparing(FriendBalanceDto::getName))
        .toList();
  }

  private static class FriendAccumulator {
    private final User user;
    private int sharedGroups;
    private BigDecimal balance = BigDecimal.ZERO;

    private FriendAccumulator(User user) {
      this.user = user;
    }
  }

  public GroupDto createGroup(Long accountId, Long userId, GroupRequest r) {
    Account a =
        accounts
            .findById(accountId)
            .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    if (a.getAccountType() != AccountType.INDIVIDUAL)
      throw new ValidationException("Shared expenses are available for personal accounts");
    User u =
        users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    SharedExpenseGroup g =
        groups.save(
            SharedExpenseGroup.builder().account(a).name(r.getName().trim()).createdBy(u).build());
    members.save(
        SharedGroupMember.builder()
            .group(g)
            .user(u)
            .memberName(u.getName())
            .email(u.getEmail())
            .mobile(u.getMobile())
            .build());
    return map(g, true);
  }

  public GroupDto addMember(Long accountId, Long userId, Long groupId, MemberRequest r) {
    SharedExpenseGroup g = group(accountId, userId, groupId);
    SharedGroupMember m =
        members.save(
            SharedGroupMember.builder()
                .group(g)
                .memberName(r.getMemberName().trim())
                .email(r.getEmail())
                .mobile(r.getMobile())
                .build());
    invitationService.inviteForMember(g, userId, m);
    log(
        g,
        userId,
        SharedActivityType.MEMBER_ADDED,
        "MEMBER",
        m.getId(),
        "added member " + m.getMemberName());
    return map(g, true);
  }

  public GroupDto updateGroup(Long accountId, Long userId, Long groupId, GroupUpdateRequest r) {
    SharedExpenseGroup g = group(accountId, userId, groupId);
    g.setName(r.getName().trim());
    g.setActive(r.getActive());
    g.setUpdatedAt(java.time.LocalDateTime.now());
    groups.save(g);
    log(
        g,
        userId,
        SharedActivityType.GROUP_UPDATED,
        "GROUP",
        g.getId(),
        r.getActive() ? "updated the group" : "archived the group");
    return map(g, true);
  }

  public GroupDto updateMember(
      Long accountId, Long userId, Long groupId, Long memberId, MemberUpdateRequest r) {
    SharedExpenseGroup g = group(accountId, userId, groupId);
    SharedGroupMember m =
        members
            .findByIdAndGroupId(memberId, groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Group member not found"));
    m.setMemberName(r.getMemberName().trim());
    m.setEmail(r.getEmail());
    m.setMobile(r.getMobile());
    m.setActive(r.getActive());
    members.save(m);
    log(
        g,
        userId,
        SharedActivityType.MEMBER_UPDATED,
        "MEMBER",
        m.getId(),
        r.getActive()
            ? "updated member " + m.getMemberName()
            : "deactivated member " + m.getMemberName());
    return map(g, true);
  }

  public GroupDto reverseExpense(Long accountId, Long userId, Long expenseId) {
    SharedExpense e =
        expenses
            .findById(expenseId)
            .orElseThrow(() -> new ResourceNotFoundException("Shared expense not found"));
    group(accountId, userId, e.getGroup().getId());
    if (e.getReversed()) throw new ValidationException("Expense is already reversed");
    e.setReversed(true);
    e.setUpdatedAt(java.time.LocalDateTime.now());
    expenses.save(e);
    log(
        e.getGroup(),
        userId,
        SharedActivityType.EXPENSE_REVERSED,
        "EXPENSE",
        e.getId(),
        "reversed expense " + e.getDescription());
    return map(e.getGroup(), true);
  }

  public GroupDto reverseSettlement(Long accountId, Long userId, Long settlementId) {
    SharedSettlement s =
        settlements
            .findById(settlementId)
            .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
    group(accountId, userId, s.getGroup().getId());
    if (s.getReversed()) throw new ValidationException("Settlement is already reversed");
    s.setReversed(true);
    settlements.save(s);
    log(
        s.getGroup(),
        userId,
        SharedActivityType.SETTLEMENT_REVERSED,
        "SETTLEMENT",
        s.getId(),
        "reversed a settlement");
    return map(s.getGroup(), true);
  }

  public void deleteGroup(Long accountId, Long userId, Long groupId) {
    // “Delete” is a soft hide: do not remove referenced rows permanently.
    SharedExpenseGroup g = group(accountId, userId, groupId);
    if (Boolean.TRUE.equals(g.getActive()))
      throw new ValidationException("Only archived groups can be deleted");

    // Soft-hide by keeping group inactive and clearing its visibility.
    // We currently model visibility using `active` only, so keep it false.
    // If you want a separate `deleted` flag later, we can add it.
    g.setDeleted(true);
    g.setUpdatedAt(java.time.LocalDateTime.now());
    groups.save(g);

    log(g, userId, SharedActivityType.GROUP_UPDATED, "GROUP", g.getId(), "deleted (hidden) group");
  }


  public GroupDto addExpense(Long accountId, Long userId, Long groupId, ExpenseRequest r) {
    SharedExpenseGroup g = group(accountId, userId, groupId);
    BigDecimal total = money(r.getTotalAmount());
    if (r.getItems() != null && !r.getItems().isEmpty()) {
      r.getItems().forEach(item -> {
        BigDecimal quantity = item.getQuantity() == null ? BigDecimal.ONE : item.getQuantity();
        if (item.getUnitPrice() != null && quantity.multiply(item.getUnitPrice()).compareTo(item.getAmount()) != 0)
          throw new ValidationException("Item amount must equal quantity multiplied by unit price");
      });
      BigDecimal itemTotal = r.getItems().stream().map(ItemRequest::getAmount).map(this::money)
          .reduce(BigDecimal.ZERO, BigDecimal::add);
      if (itemTotal.compareTo(total) != 0) throw new ValidationException("Item total must equal expense total");
    }
    List<AmountRow> payerRows = r.getPayers();
    if (payerRows == null || payerRows.isEmpty()) {
      if (r.getPaidByMemberId() == null) throw new ValidationException("Select at least one payer");
      AmountRow row = new AmountRow();
      row.setMemberId(r.getPaidByMemberId());
      row.setAmount(total);
      payerRows = List.of(row);
    }
    Map<Long, BigDecimal> paid = new LinkedHashMap<>();
    for (AmountRow x : payerRows) {
      member(g, x.getMemberId());
      if (paid.put(x.getMemberId(), money(x.getAmount())) != null)
        throw new ValidationException("Duplicate payer");
    }
    if (paid.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add).compareTo(total) != 0)
      throw new ValidationException("Payer total must equal expense total");
    List<SharedGroupMember> participants =
        r.getParticipantIds().stream().distinct().map(id -> member(g, id)).toList();
    if (participants.isEmpty()) throw new ValidationException("Select at least one participant");
    Map<Long, BigDecimal> owed =
        r.getSplitType() == SharedSplitType.EQUAL
            ? SharedSplitCalculator.equal(
                total, participants.stream().map(SharedGroupMember::getId).toList())
            : new LinkedHashMap<>();
    if (r.getSplitType() == SharedSplitType.EXACT) {
      if (r.getShares() == null) throw new ValidationException("Exact shares are required");
      for (AmountRow x : r.getShares()) {
        member(g, x.getMemberId());
        if (owed.put(x.getMemberId(), money(x.getAmount())) != null)
          throw new ValidationException("Duplicate member share");
      }
      if (!owed.keySet()
          .equals(participants.stream().map(SharedGroupMember::getId).collect(toSet())))
        throw new ValidationException("Exact shares must match participants");
    }
    SharedSplitCalculator.requireTotal(total, owed.values());
    User u = users.findById(userId).orElseThrow();
    SharedExpense e =
        expenses.save(
            SharedExpense.builder()
                .group(g)
                .createdBy(u)
                .description(r.getDescription().trim())
                .category(r.getCategory())
                .expenseDate(r.getExpenseDate())
                .totalAmount(total)
                .splitType(r.getSplitType())
                .build());
    if (r.getItems() != null) {
      for (int index = 0; index < r.getItems().size(); index++) {
        ItemRequest item = r.getItems().get(index);
        items.save(SharedExpenseItem.builder().expense(e).itemName(item.getItemName().trim())
            .quantity(item.getQuantity() == null ? BigDecimal.ONE : item.getQuantity()).unitPrice(item.getUnitPrice())
            .amount(money(item.getAmount())).displayOrder(index).build());
      }
    }
    paid.forEach(
        (id, amount) ->
            payers.save(
                SharedExpensePayer.builder()
                    .expense(e)
                    .member(member(g, id))
                    .paidAmount(amount)
                    .build()));
    owed.forEach(
        (id, amount) ->
            shares.save(
                SharedExpenseShare.builder()
                    .expense(e)
                    .member(member(g, id))
                    .owedAmount(amount)
                    .build()));
    activities.save(
        SharedExpenseActivity.builder()
            .group(g)
            .actor(u)
            .activityType(SharedActivityType.EXPENSE_ADDED)
            .referenceType("EXPENSE")
            .referenceId(e.getId())
            .message("Added expense: " + e.getDescription())
            .build());
    return map(g, true);
  }

  public GroupDto settle(Long accountId, Long userId, Long groupId, SettlementRequest r) {
    SharedExpenseGroup g = group(accountId, userId, groupId);
    if (r.getPaidByMemberId().equals(r.getPaidToMemberId()))
      throw new ValidationException("Settlement members must be different");
    SharedSettlement s =
        settlements.save(
            SharedSettlement.builder()
                .group(g)
                .paidBy(member(g, r.getPaidByMemberId()))
                .paidTo(member(g, r.getPaidToMemberId()))
                .amount(money(r.getAmount()))
                .settlementDate(r.getSettlementDate())
                .paymentMode(r.getPaymentMode())
                .notes(r.getNotes())
                .createdBy(users.findById(userId).orElseThrow())
                .build());
    log(
        g,
        userId,
        SharedActivityType.SETTLEMENT_ADDED,
        "SETTLEMENT",
        s.getId(),
        "recorded a settlement");
    return map(g, true);
  }

  private void log(
      SharedExpenseGroup g,
      Long userId,
      SharedActivityType type,
      String referenceType,
      Long referenceId,
      String message) {
    activities.save(
        SharedExpenseActivity.builder()
            .group(g)
            .actor(users.findById(userId).orElseThrow())
            .activityType(type)
            .referenceType(referenceType)
            .referenceId(referenceId)
            .message(message)
            .build());
  }

  private SharedExpenseGroup group(Long a, Long userId, Long g) {
    return groups
        .findAccessibleById(g, a, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Shared expense group not found"));
  }

  private SharedGroupMember member(SharedExpenseGroup g, Long id) {
    SharedGroupMember m =
        members
            .findByIdAndGroupId(id, g.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Group member not found"));
    if (!m.getActive()) throw new ValidationException("Group member is inactive");
    return m;
  }

  private BigDecimal money(BigDecimal x) {
    return x.setScale(2, RoundingMode.UNNECESSARY);
  }

  private GroupDto map(SharedExpenseGroup g, boolean detail) {
    return map(g, detail, members.findByGroupIdOrderByMemberName(g.getId()));
  }

  private GroupDto map(SharedExpenseGroup g, boolean detail, List<SharedGroupMember> ms) {
    List<SharedExpensePayer> groupPayers =
        detail ? payers.findByExpenseGroupIdAndExpenseReversedFalse(g.getId()) : List.of();
    Map<Long, BigDecimal> b = detail ? calculateBalances(g.getId(), ms, groupPayers) : Map.of();
    Map<Long, List<SharedExpensePayer>> payersByExpense =
        groupPayers.stream().collect(groupingBy(x -> x.getExpense().getId()));
    Map<Long, List<SharedExpenseItem>> itemsByExpense =
        detail
            ? items.findByExpenseGroupIdOrderByExpenseExpenseDateDescExpenseIdDescDisplayOrderAscIdAsc(g.getId())
                .stream()
                .collect(groupingBy(x -> x.getExpense().getId(), LinkedHashMap::new, toList()))
            : Map.of();
    List<MemberDto> md =
        ms.stream()
            .map(
                x ->
                    MemberDto.builder()
                        .id(x.getId())
                        .userId(x.getUser() == null ? null : x.getUser().getId())
                        .memberName(x.getMemberName())
                        .email(x.getEmail())
                        .mobile(x.getMobile())
                        .active(x.getActive())
                        .build())
            .toList();
    List<BalanceDto> bd =
        detail
            ? ms.stream()
                .map(
                    x ->
                        BalanceDto.builder()
                            .memberId(x.getId())
                            .memberName(x.getMemberName())
                            .balance(b.get(x.getId()))
                            .build())
                .toList()
            : List.of();
    List<ExpenseDto> ed =
        detail
            ? expenses.findByGroupIdOrderByExpenseDateDescIdDesc(g.getId()).stream()
                .map(
                    x ->
                        ExpenseDto.builder()
                            .id(x.getId())
                            .description(x.getDescription())
                            .category(x.getCategory())
                            .expenseDate(x.getExpenseDate())
                            .totalAmount(x.getTotalAmount())
                            .splitType(x.getSplitType())
                            .reversed(x.getReversed())
                            .paidBy(
                                payersByExpense.getOrDefault(x.getId(), List.of()).stream()
                                    .map(p -> p.getMember().getMemberName())
                                    .distinct()
                                    .collect(joining(", ")))
                            .payers(
                                payersByExpense.getOrDefault(x.getId(), List.of()).stream()
                                    .map(p -> ExpensePayerDto.builder()
                                        .memberId(p.getMember().getId())
                                        .memberName(p.getMember().getMemberName())
                                        .amount(p.getPaidAmount())
                                        .build())
                                    .toList())
                            .items(itemsByExpense.getOrDefault(x.getId(), List.of()).stream()
                                .map(item -> ItemDto.builder().id(item.getId()).itemName(item.getItemName()).quantity(item.getQuantity()).unitPrice(item.getUnitPrice()).amount(item.getAmount()).build())
                                .toList())
                            .build())
                .toList()
            : List.of();
    List<ActivityDto> ad =
        detail
            ? activities.findTop100ByGroupIdOrderByCreatedAtDesc(g.getId()).stream()
                .map(
                    x ->
                        ActivityDto.builder()
                            .id(x.getId())
                            .activityType(x.getActivityType().name())
                            .message(x.getMessage())
                            .actorName(x.getActor().getName())
                            .createdAt(x.getCreatedAt())
                            .build())
                .toList()
            : List.of();
    return GroupDto.builder()
        .id(g.getId())
        .name(g.getName())
        .active(g.getActive())
        .members(md)
        .expenses(ed)
        .balances(bd)
        .activities(ad)
        .build();
  }

  private Map<Long, BigDecimal> calculateBalances(
      Long groupId, List<SharedGroupMember> groupMembers) {
    return calculateBalances(
        groupId, groupMembers, payers.findByExpenseGroupIdAndExpenseReversedFalse(groupId));
  }

  private Map<Long, BigDecimal> calculateBalances(
      Long groupId,
      List<SharedGroupMember> groupMembers,
      List<SharedExpensePayer> groupPayers) {
    return calculateBalances(groupMembers, groupPayers,
        shares.findByExpenseGroupIdAndExpenseReversedFalse(groupId),
        settlements.findByGroupIdAndReversedFalse(groupId));
  }

  private Map<Long, BigDecimal> calculateBalances(
      List<SharedGroupMember> groupMembers, List<SharedExpensePayer> groupPayers,
      List<SharedExpenseShare> groupShares, List<SharedSettlement> groupSettlements) {
    Map<Long, BigDecimal> balances =
        groupMembers.stream()
            .collect(toMap(SharedGroupMember::getId, x -> BigDecimal.ZERO));
    groupPayers.forEach(
        x -> balances.computeIfPresent(
            x.getMember().getId(), (k, v) -> v.add(x.getPaidAmount())));
    groupShares.forEach(
        x -> balances.computeIfPresent(
            x.getMember().getId(), (k, v) -> v.subtract(x.getOwedAmount())));
    groupSettlements.forEach(
        x -> {
          balances.computeIfPresent(x.getPaidBy().getId(), (k, v) -> v.add(x.getAmount()));
          balances.computeIfPresent(x.getPaidTo().getId(), (k, v) -> v.subtract(x.getAmount()));
        });
    return balances;
  }
}
