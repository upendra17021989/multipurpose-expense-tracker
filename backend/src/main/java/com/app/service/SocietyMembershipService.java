package com.app.service;

import com.app.dto.SocietyMembershipRequestDto;
import com.app.dto.SocietyOptionDto;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.AccountUserMembership;
import com.app.entity.UserRole;
import com.app.exception.UnauthorizedException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SocietyMembershipService {
    private final AccountRepository accountRepository;
    private final AccountUserMembershipRepository membershipRepository;

    public List<SocietyOptionDto> listSocieties() {
        return accountRepository.findByAccountTypeAndActiveTrueOrderByAccountNameAsc(AccountType.SOCIETY).stream()
                .map(account -> new SocietyOptionDto(account.getId(), account.getAccountName(), account.getAddress()))
                .toList();
    }

    public List<SocietyMembershipRequestDto> pending(Long accountId, Long adminUserId) {
        requireAdmin(accountId, adminUserId);
        return membershipRepository.findByAccountIdAndActiveFalseOrderByCreatedAtAsc(accountId).stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public SocietyMembershipRequestDto approve(Long accountId, Long adminUserId, Long requestId) {
        requireAdmin(accountId, adminUserId);
        AccountUserMembership membership = pendingRequest(accountId, requestId);
        membership.setActive(true);
        membership.setUpdatedAt(LocalDateTime.now());
        return toDto(membershipRepository.save(membership));
    }

    @Transactional
    public void reject(Long accountId, Long adminUserId, Long requestId) {
        requireAdmin(accountId, adminUserId);
        membershipRepository.delete(pendingRequest(accountId, requestId));
    }

    private AccountUserMembership pendingRequest(Long accountId, Long requestId) {
        AccountUserMembership membership = membershipRepository.findById(requestId)
                .orElseThrow(() -> new ValidationException("Membership request not found"));
        if (!membership.getAccount().getId().equals(accountId) || Boolean.TRUE.equals(membership.getActive())) {
            throw new ValidationException("Membership request not found");
        }
        return membership;
    }

    private void requireAdmin(Long accountId, Long userId) {
        Account account = accountRepository.findById(accountId)
                .filter(item -> item.getAccountType() == AccountType.SOCIETY)
                .orElseThrow(() -> new ValidationException("Society not found"));
        if (account.getUser().getId().equals(userId) && account.getRole() == UserRole.ADMIN) return;
        boolean admin = membershipRepository.findByAccountIdAndUserIdAndActiveTrue(accountId, userId)
                .map(item -> item.getRole() == UserRole.ADMIN).orElse(false);
        if (!admin) throw new UnauthorizedException("Only society admins can manage membership requests");
    }

    private SocietyMembershipRequestDto toDto(AccountUserMembership membership) {
        return SocietyMembershipRequestDto.builder().id(membership.getId())
                .userId(membership.getUser().getId()).name(membership.getUser().getName())
                .mobile(membership.getUser().getMobile()).email(membership.getUser().getEmail())
                .requestedAt(membership.getCreatedAt()).build();
    }
}
