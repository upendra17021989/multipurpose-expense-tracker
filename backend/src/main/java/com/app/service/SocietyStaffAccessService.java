package com.app.service;

import com.app.dto.GrantSocietyStaffAccessRequest;
import com.app.dto.SocietyStaffAccessDto;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SocietyStaffAccessService {
    private final AccountRepository accountRepository;
    private final AccountUserMembershipRepository membershipRepository;
    private final SocietyStaffRepository staffRepository;
    private final SocietyStaffAccessRepository accessRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public SocietyStaffAccessDto get(Long accountId, Long actorUserId, Long staffId) {
        requireAdmin(accountId, actorUserId);
        requireStaff(accountId, staffId);
        return accessRepository.findByAccountIdAndStaffId(accountId, staffId)
                .map(this::map)
                .orElse(null);
    }

    @Transactional
    public SocietyStaffAccessDto grant(Long accountId, Long actorUserId, Long staffId,
                                       GrantSocietyStaffAccessRequest request) {
        Account account = requireAdmin(accountId, actorUserId);
        SocietyStaff staff = requireStaff(accountId, staffId);
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new ValidationException("Admin user not found"));
        User user = resolveUser(request, staff);

        if (account.getUser().getId().equals(user.getId())) {
            throw new ValidationException("The society owner already has administrator access");
        }
        membershipRepository.findByAccountIdAndUserId(accountId, user.getId()).ifPresent(existing -> {
            throw new ValidationException("This user already accesses the society as a member");
        });
        accessRepository.findByAccountIdAndUserId(accountId, user.getId()).ifPresent(existing -> {
            if (!existing.getStaff().getId().equals(staffId)) {
                throw new ValidationException("This user is already linked to another staff record");
            }
        });

        LocalDateTime now = LocalDateTime.now();
        SocietyStaffAccess access = accessRepository.findByAccountIdAndStaffId(accountId, staffId)
                .orElseGet(() -> SocietyStaffAccess.builder()
                        .account(account).staff(staff).user(user).grantedBy(actor).build());
        access.setUser(user);
        access.setGrantedBy(actor);
        access.setRole(UserRole.STAFF_SUPERVISOR);
        access.setStatus(StaffAccessStatus.ACTIVE);
        access.setActivatedAt(now);
        access.setSuspendedAt(null);
        access.setRevokedAt(null);
        return map(accessRepository.save(access));
    }

    @Transactional
    public SocietyStaffAccessDto updateStatus(Long accountId, Long actorUserId, Long staffId,
                                              StaffAccessStatus status) {
        requireAdmin(accountId, actorUserId);
        requireStaff(accountId, staffId);
        SocietyStaffAccess access = accessRepository.findByAccountIdAndStaffId(accountId, staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff access has not been granted"));
        LocalDateTime now = LocalDateTime.now();
        access.setStatus(status);
        if (status == StaffAccessStatus.ACTIVE) {
            access.setActivatedAt(now);
            access.setSuspendedAt(null);
            access.setRevokedAt(null);
        } else if (status == StaffAccessStatus.SUSPENDED) {
            access.setSuspendedAt(now);
        } else {
            access.setRevokedAt(now);
        }
        return map(accessRepository.save(access));
    }

    private User resolveUser(GrantSocietyStaffAccessRequest request, SocietyStaff staff) {
        String mobile = clean(request == null ? null : request.getMobile());
        String email = clean(request == null ? null : request.getEmail());
        if (mobile == null && email == null) {
            mobile = clean(staff.getMobile());
            email = clean(staff.getEmail());
        }
        Optional<User> byMobile = mobile == null ? Optional.empty() : userRepository.findByMobile(mobile);
        Optional<User> byEmail = email == null ? Optional.empty() : userRepository.findByEmailIgnoreCase(email);
        if (byMobile.isPresent() && byEmail.isPresent()
                && !byMobile.get().getId().equals(byEmail.get().getId())) {
            throw new ValidationException("Mobile number and email belong to different users");
        }
        User user = byMobile.or(() -> byEmail)
                .orElseThrow(() -> new ValidationException(
                        "No registered user matches this staff mobile number or email"));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ValidationException("The matched user account is inactive");
        }
        return user;
    }

    private Account requireAdmin(Long accountId, Long userId) {
        Account account = accountRepository.findById(accountId)
                .filter(value -> value.getAccountType() == AccountType.SOCIETY
                        && Boolean.TRUE.equals(value.getActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Society not found"));
        boolean ownerAdmin = account.getUser().getId().equals(userId) && account.getRole() == UserRole.ADMIN;
        boolean memberAdmin = membershipRepository.findByAccountIdAndUserIdAndActiveTrue(accountId, userId)
                .map(value -> value.getRole() == UserRole.ADMIN).orElse(false);
        if (!ownerAdmin && !memberAdmin) {
            throw new ValidationException("Only a society admin can manage staff access");
        }
        return account;
    }

    private SocietyStaff requireStaff(Long accountId, Long staffId) {
        return staffRepository.findByAccountIdAndIdAndActiveTrue(accountId, staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Active staff member not found"));
    }

    private SocietyStaffAccessDto map(SocietyStaffAccess access) {
        User user = access.getUser();
        return SocietyStaffAccessDto.builder()
                .id(access.getId()).accountId(access.getAccount().getId())
                .staffId(access.getStaff().getId()).userId(user.getId())
                .userName(user.getName()).mobile(user.getMobile()).email(user.getEmail())
                .role(access.getRole()).status(access.getStatus())
                .grantedByUserId(access.getGrantedBy().getId())
                .activatedAt(access.getActivatedAt()).suspendedAt(access.getSuspendedAt())
                .revokedAt(access.getRevokedAt()).createdAt(access.getCreatedAt())
                .updatedAt(access.getUpdatedAt()).build();
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
