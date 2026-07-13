package com.app.service;

import com.app.dto.AccountDto;
import com.app.dto.LoginRequest;
import com.app.dto.LoginResponse;
import com.app.dto.RegisterRequest;
import com.app.dto.ResetPasswordRequest;
import com.app.dto.UserDto;
import com.app.dto.UpdateProfileRequest;
import com.app.dto.ChangePasswordRequest;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.User;
import com.app.entity.UserRole;
import com.app.exception.UnauthorizedException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.AccountUserMembershipRepository;
import com.app.repository.UserRepository;
import com.app.util.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final AccountUserMembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final ExpenseCategoryService expenseCategoryService;
    private final SharedInvitationService sharedInvitationService;

    public AuthService(UserRepository userRepository, AccountRepository accountRepository,
                       AccountUserMembershipRepository membershipRepository,
                       PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider,
                       ExpenseCategoryService expenseCategoryService,
                       SharedInvitationService sharedInvitationService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.expenseCategoryService = expenseCategoryService;
        this.sharedInvitationService = sharedInvitationService;
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (userRepository.findByMobile(request.getMobile()).isPresent()) {
            throw new ValidationException("You already have an account. Please log in to add or join another workspace.");
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            throw new ValidationException("This email is already registered. Please log in to add or join another workspace.");
        }

        User user = createUser(request);

        if (request.getAccountType() == AccountType.SOCIETY
                && request.getSocietyId() != null
                && !Boolean.TRUE.equals(request.getCreateNewSociety())) {
            requestSocietyMembership(request.getSocietyId(), user);
            sharedInvitationService.claimPendingInvitations(user);
            log.info("Society membership requested for account {} by user {}", request.getSocietyId(), user.getId());
            return mapToUserDto(user);
        }

        Account account = buildInitialAccount(request, user);
        Account savedAccount = accountRepository.save(account);
        expenseCategoryService.seedDefaultCategories(savedAccount);
        sharedInvitationService.claimPendingInvitations(user);
        log.info("Account {} created for user ID: {}", savedAccount.getId(), user.getId());

        return mapToUserDto(user);
    }

    @Transactional
    public LoginResponse addWorkspace(Long userId, Long currentAccountId, RegisterRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new UnauthorizedException("This account is inactive. Please contact support.");
        }

        if (request.getAccountType() == AccountType.SOCIETY
                && request.getSocietyId() != null
                && !Boolean.TRUE.equals(request.getCreateNewSociety())) {
            requestSocietyMembership(request.getSocietyId(), user);
            sharedInvitationService.claimPendingInvitations(user);
            return buildAccountLoginResponse(user, currentAccountId);
        }

        Account account = buildInitialAccount(request, user);
        Account savedAccount = accountRepository.save(account);
        expenseCategoryService.seedDefaultCategories(savedAccount);
        sharedInvitationService.claimPendingInvitations(user);
        log.info("Workspace account {} created for existing user ID: {}", savedAccount.getId(), user.getId());
        return buildAccountLoginResponse(user, savedAccount.getId());
    }

    private void requestSocietyMembership(Long societyId, User user) {
        Account society = accountRepository.findById(societyId)
                .filter(account -> account.getAccountType() == AccountType.SOCIETY && Boolean.TRUE.equals(account.getActive()))
                .orElseThrow(() -> new ValidationException("Society not found"));
        if (society.getUser().getId().equals(user.getId())
                || membershipRepository.findByAccountIdAndUserId(societyId, user.getId()).isPresent()) {
            throw new ValidationException("You already belong to, or have requested access to, this society");
        }
        membershipRepository.save(com.app.entity.AccountUserMembership.builder()
                .account(society).user(user).role(UserRole.MEMBER).active(false).build());
    }

    public LoginResponse login(LoginRequest request) {
        User user = findLoginUser(request.getMobile());

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Incorrect password. Please try again or reset your password.");
        }

        List<AccountDto> accounts = getAccessibleAccountDtos(user.getId());
        if (accounts.isEmpty()) {
            throw new ValidationException("No active account found for this user");
        }

        AccountDto firstAccount = accounts.get(0);
        String token = tokenProvider.generateToken(user.getId(), firstAccount.getId());
        return buildLoginResponse(user, accounts, firstAccount, token);
    }

    public LoginResponse loginWithAccount(LoginRequest request, Long accountId) {
        User user = findLoginUser(request.getMobile());

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Incorrect password. Please try again or reset your password.");
        }

        return buildAccountLoginResponse(user, accountId);
    }


    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByMobile(request.getMobile())
                .orElseThrow(() -> new ValidationException("No account is registered with this mobile number."));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ValidationException("This account is inactive. Please contact support.");
        }
        if (user.getEmail() == null || !user.getEmail().equalsIgnoreCase(request.getEmail().trim())) {
            throw new ValidationException("The email does not match the email registered with this mobile number.");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ValidationException("New password and confirm password do not match.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
    }

    private User findLoginUser(String mobile) {
        User user = userRepository.findByMobile(mobile)
                .orElseThrow(() -> new UnauthorizedException("No account is registered with this mobile number."));
        if (!Boolean.TRUE.equals(user.getActive())) throw new UnauthorizedException("This account is inactive. Please contact support.");
        return user;
    }
    public LoginResponse switchAccount(Long userId, Long accountId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        return buildAccountLoginResponse(user, accountId);
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        String name = request.getName().trim();
        String mobile = request.getMobile().trim();
        String email = request.getEmail() == null || request.getEmail().isBlank()
                ? null : request.getEmail().trim().toLowerCase();

        if (userRepository.existsByMobileAndIdNot(mobile, userId)) {
            throw new ValidationException("Mobile number is already registered");
        }
        if (email != null && userRepository.existsByEmailIgnoreCaseAndIdNot(email, userId)) {
            throw new ValidationException("Email is already registered");
        }

        user.setName(name);
        user.setMobile(mobile);
        user.setEmail(email);
        user.setUpdatedAt(java.time.LocalDateTime.now());
        return mapToUserDto(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Current password is incorrect");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ValidationException("New password and confirm password do not match");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new ValidationException("New password must be different from the current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
    }

    private LoginResponse buildAccountLoginResponse(User user, Long accountId) {
        List<AccountDto> accounts = getAccessibleAccountDtos(user.getId());
        AccountDto selectedAccount = accounts.stream()
                .filter(account -> account.getId().equals(accountId))
                .findFirst()
                .orElseThrow(() -> new ValidationException("Account not found or not accessible"));

        String token = tokenProvider.generateToken(user.getId(), selectedAccount.getId());
        return buildLoginResponse(user, accounts, selectedAccount, token);
    }

    private LoginResponse buildLoginResponse(User user, List<AccountDto> accounts, AccountDto currentAccount, String token) {
        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .user(mapToUserDto(user))
                .accounts(accounts)
                .currentAccount(currentAccount)
                .build();
    }

    private List<AccountDto> getAccessibleAccountDtos(Long userId) {
        Map<Long, AccountDto> accounts = new LinkedHashMap<>();
        accountRepository.findByUserIdAndActive(userId, true)
                .forEach(account -> accounts.put(account.getId(), mapToAccountDto(account)));
        membershipRepository.findByUserIdAndActiveTrue(userId).forEach(membership -> {
            Account account = membership.getAccount();
            if (Boolean.TRUE.equals(account.getActive())) {
                accounts.put(account.getId(), mapToAccountDto(account, membership.getRole(), userId));
            }
        });
        return new ArrayList<>(accounts.values());
    }


    private User createUser(RegisterRequest request) {
        if (request.getEmail() != null && !request.getEmail().isBlank() && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ValidationException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .mobile(request.getMobile())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .active(true)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User registered with ID: {}", savedUser.getId());
        return savedUser;
    }

    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .mobile(user.getMobile())
                .email(user.getEmail())
                .active(user.getActive())
                .systemAdmin(Boolean.TRUE.equals(user.getSystemAdmin()))
                .createdAt(user.getCreatedAt())
                .build();
    }

    private AccountDto mapToAccountDto(Account account) {
        return mapToAccountDto(account, account.getRole(), account.getUser().getId());
    }

    private AccountDto mapToAccountDto(Account account, UserRole role, Long userId) {
        return AccountDto.builder()
                .id(account.getId())
                .userId(userId)
                .accountType(account.getAccountType())
                .accountName(account.getAccountName())
                .address(account.getAddress())
                .societyName(account.getSocietyName())
                .storeName(account.getStoreName())
                .role(role)
                .active(account.getActive())
                .createdAt(account.getCreatedAt())
                .build();
    }

    private Account buildInitialAccount(RegisterRequest request, User user) {
        AccountType accountType = request.getAccountType() != null ? request.getAccountType() : AccountType.INDIVIDUAL;
        String accountName = request.getAccountName();
        if (accountName == null || accountName.isBlank()) {
            accountName = switch (accountType) {
                case INDIVIDUAL -> user.getName() + "'s Account";
                case SOCIETY -> request.getSocietyName();
                case KIRANA_STORE -> request.getStoreName();
                case SPORTS -> request.getAccountName();
            };
        }
        if (accountName == null || accountName.isBlank()) {
            throw new ValidationException("Account name is required");
        }

        return Account.builder()
                .user(user)
                .accountType(accountType)
                .accountName(accountName)
                .address(request.getAddress())
                .societyName(request.getSocietyName())
                .storeName(request.getStoreName())
                .role(resolveInitialRole(accountType, request.getRole()))
                .active(true)
                .build();
    }

    private UserRole resolveInitialRole(AccountType accountType, UserRole requestedRole) {
        if (requestedRole != null) {
            return requestedRole;
        }
        return switch (accountType) {
            case SOCIETY -> UserRole.ADMIN;
            case KIRANA_STORE -> UserRole.STORE_OWNER;
            case INDIVIDUAL, SPORTS -> UserRole.OWNER;
        };
    }
}

