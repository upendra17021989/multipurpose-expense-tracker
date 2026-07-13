package com.app.service;

import com.app.dto.ApproveSocietyMembershipRequest;
import com.app.dto.SocietyMembershipRequestDto;
import com.app.dto.SocietyOptionDto;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.AccountUserMembership;
import com.app.entity.Flat;
import com.app.entity.FlatMember;
import com.app.entity.UserRole;
import com.app.exception.UnauthorizedException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
import com.app.repository.FlatMemberRepository;
import com.app.repository.FlatRepository;
import com.app.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final FlatRepository flatRepository;
    private final FlatMemberRepository flatMemberRepository;

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

    public List<SocietyMembershipRequestDto> members(Long accountId, Long adminUserId) {
        requireAdmin(accountId, adminUserId);
        return membershipRepository.findByAccountIdAndActiveTrueOrderByCreatedAtAsc(accountId).stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public SocietyMembershipRequestDto updateRole(Long accountId, Long adminUserId, Long membershipId, UserRole role) {
        requireAdmin(accountId, adminUserId);
        if (role != UserRole.ADMIN && role != UserRole.TREASURER && role != UserRole.MEMBER) {
            throw new ValidationException("Society role must be ADMIN, TREASURER, or MEMBER");
        }
        AccountUserMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ValidationException("Society member not found"));
        if (!membership.getAccount().getId().equals(accountId) || !Boolean.TRUE.equals(membership.getActive())) {
            throw new ValidationException("Society member not found");
        }
        if (membership.getUser().getId().equals(adminUserId) && role != UserRole.ADMIN) {
            throw new ValidationException("You cannot remove your own admin access");
        }
        membership.setRole(role);
        membership.setUpdatedAt(LocalDateTime.now());
        return toDto(membershipRepository.save(membership));
    }

    @Transactional
    public SocietyMembershipRequestDto requestMembership(Long societyId, Long userId, String blockName, String flatNumber, String relation) {
        Account society = accountRepository.findById(societyId)
                .filter(account -> account.getAccountType() == AccountType.SOCIETY && Boolean.TRUE.equals(account.getActive()))
                .orElseThrow(() -> new ValidationException("Society not found"));
        if (society.getUser().getId().equals(userId)
                || membershipRepository.findByAccountIdAndUserId(societyId, userId).isPresent()) {
            throw new ValidationException("You already belong to, or have requested access to, this society");
        }
        validateRequestedFlat(blockName, flatNumber, relation);
        AccountUserMembership membership = AccountUserMembership.builder()
                .account(society)
                .user(userRepository.findById(userId).orElseThrow(() -> new ValidationException("User not found")))
                .role(UserRole.MEMBER)
                .requestedBlockName(clean(blockName))
                .requestedFlatNumber(clean(flatNumber))
                .requestedRelation(clean(relation))
                .active(false)
                .build();
        return toDto(membershipRepository.save(membership));
    }

    @Transactional
    public SocietyMembershipRequestDto approve(Long accountId, Long adminUserId, Long requestId, ApproveSocietyMembershipRequest request) {
        requireAdmin(accountId, adminUserId);
        AccountUserMembership membership = pendingRequest(accountId, requestId);
        Flat flat = flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, request.getFlatId())
                .orElseThrow(() -> new ValidationException("Select a valid active flat before approving this member"));
        String relation = request.getRelation() == null ? "" : request.getRelation().trim();
        if (relation.isBlank()) {
            throw new ValidationException("Flat relation is required");
        }

        FlatMember flatMember = FlatMember.builder()
                .flat(flat)
                .memberName(membership.getUser().getName())
                .mobile(membership.getUser().getMobile())
                .email(membership.getUser().getEmail())
                .relation(relation)
                .active(true)
                .build();
        flatMemberRepository.save(flatMember);

        membership.setActive(true);
        membership.setUpdatedAt(LocalDateTime.now());
        return toDto(membershipRepository.save(membership), flatMember);
    }

    @Transactional
    public void reject(Long accountId, Long adminUserId, Long requestId) {
        requireAdmin(accountId, adminUserId);
        membershipRepository.delete(pendingRequest(accountId, requestId));
    }

    private void validateRequestedFlat(String blockName, String flatNumber, String relation) {
        if (clean(blockName) == null) throw new ValidationException("Block is required for society membership request");
        if (clean(flatNumber) == null) throw new ValidationException("Flat number is required for society membership request");
        if (clean(relation) == null) throw new ValidationException("Flat relation is required for society membership request");
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
        return toDto(membership, null);
    }

    private SocietyMembershipRequestDto toDto(AccountUserMembership membership, FlatMember flatMember) {
        SocietyMembershipRequestDto.SocietyMembershipRequestDtoBuilder builder = SocietyMembershipRequestDto.builder()
                .id(membership.getId())
                .userId(membership.getUser().getId()).name(membership.getUser().getName())
                .mobile(membership.getUser().getMobile()).email(membership.getUser().getEmail())
                .requestedAt(membership.getCreatedAt()).role(membership.getRole())
                .requestedBlockName(membership.getRequestedBlockName())
                .requestedFlatNumber(membership.getRequestedFlatNumber())
                .requestedRelation(membership.getRequestedRelation());
        if (flatMember != null) {
            Flat flat = flatMember.getFlat();
            builder.flatId(flat.getId())
                    .flatLabel(flat.getBlockName() + "-" + flat.getFlatNumber())
                    .flatRelation(flatMember.getRelation());
        }
        return builder.build();
    }
}


