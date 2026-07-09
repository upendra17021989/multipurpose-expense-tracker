package com.app.service;

import com.app.dto.SystemAdminManagementDtos.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service @RequiredArgsConstructor
public class SystemAdminManagementService {
    private final UserRepository users;
    private final AccountRepository accounts;
    private final AccountUserMembershipRepository memberships;

    @Transactional(readOnly = true)
    public Page<UserRow> users(String query, Boolean active, int page, int size) {
        validatePage(page, size);
        Specification<User> spec = Specification.where(null);
        if (StringUtils.hasText(query)) {
            String value = "%" + query.trim().toLowerCase() + "%";
            spec = spec.and((r, q, cb) -> cb.or(cb.like(cb.lower(r.get("name")), value),
                    cb.like(cb.lower(r.get("mobile")), value), cb.like(cb.lower(r.get("email")), value)));
        }
        if (active != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("active"), active));
        return users.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))).map(this::userRow);
    }

    @Transactional(readOnly = true)
    public Page<AccountRow> accounts(String query, AccountType type, Boolean active, int page, int size) {
        validatePage(page, size);
        Specification<Account> spec = Specification.where(null);
        if (StringUtils.hasText(query)) {
            String value = "%" + query.trim().toLowerCase() + "%";
            spec = spec.and((r, q, cb) -> cb.or(cb.like(cb.lower(r.get("accountName")), value),
                    cb.like(cb.lower(r.get("user").get("name")), value),
                    cb.like(cb.lower(r.get("user").get("mobile")), value)));
        }
        if (type != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("accountType"), type));
        if (active != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("active"), active));
        return accounts.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))).map(this::accountRow);
    }

    @Transactional
    public UserRow setUserActive(Long actorId, Long id, boolean active) {
        User user = findUser(id);
        if (!active && user.getId().equals(actorId)) throw new ValidationException("You cannot suspend your own user");
        if (!active && Boolean.TRUE.equals(user.getSystemAdmin()) && users.countBySystemAdminTrueAndActiveTrue() <= 1)
            throw new ValidationException("The final active platform administrator cannot be suspended");
        user.setActive(active);
        return userRow(users.save(user));
    }

    @Transactional
    public UserRow setSystemAdmin(Long actorId, Long id, boolean systemAdmin) {
        User user = findUser(id);
        if (!systemAdmin && user.getId().equals(actorId)) throw new ValidationException("You cannot remove your own platform access");
        if (!systemAdmin && Boolean.TRUE.equals(user.getSystemAdmin()) && Boolean.TRUE.equals(user.getActive())
                && users.countBySystemAdminTrueAndActiveTrue() <= 1)
            throw new ValidationException("The final active platform administrator cannot be removed");
        if (systemAdmin && !Boolean.TRUE.equals(user.getActive()))
            throw new ValidationException("Activate the user before granting platform access");
        user.setSystemAdmin(systemAdmin);
        return userRow(users.save(user));
    }

    @Transactional
    public AccountRow setAccountActive(Long id, boolean active) {
        Account account = accounts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        account.setActive(active);
        return accountRow(accounts.save(account));
    }

    private User findUser(Long id) { return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found")); }
    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ValidationException("Invalid page or size");
    }
    private UserRow userRow(User u) {
        return UserRow.builder().id(u.getId()).name(u.getName()).mobile(u.getMobile()).email(u.getEmail())
                .active(u.getActive()).systemAdmin(u.getSystemAdmin()).createdAt(u.getCreatedAt()).build();
    }
    private AccountRow accountRow(Account a) {
        User owner = a.getUser();
        return AccountRow.builder().id(a.getId()).accountName(a.getAccountName()).accountType(a.getAccountType())
                .active(a.getActive()).ownerId(owner.getId()).ownerName(owner.getName()).ownerMobile(owner.getMobile())
                .ownerRole(a.getRole()).activeMembers(memberships.countByAccountIdAndActiveTrue(a.getId()))
                .createdAt(a.getCreatedAt()).build();
    }
}
