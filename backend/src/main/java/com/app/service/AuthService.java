package com.app.service;

import com.app.dto.AccountDto;
import com.app.dto.LoginRequest;
import com.app.dto.LoginResponse;
import com.app.dto.RegisterRequest;
import com.app.dto.ResetPasswordRequest;
import com.app.dto.UserDto;
import com.app.dto.UpdateProfileRequest;
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
        User user = userRepository.findByMobile(request.getMobile())
                .map(existingUser -> validateExistingUserForNewAccount(existingUser, request))
                .orElseGet(() -> createUser(request));

        Account account = buildInitialAccount(request, user);
        Account savedAccount = accountRepository.save(account);
        expenseCategoryService.seedDefaultCategories(savedAccount);
        sharedInvitationService.claimPendingInvitations(user);
        log.info("Account {} created for user ID: {}", savedAccount.getId(), user.getId());

        return mapToUserDto(user);
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

    private User validateExistingUserForNewAccount(User user, RegisterRequest request) {
        if (!user.getActive()) {
            throw new ValidationException("User is inactive");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Mobile already exists. Enter the correct password to add another account type.");
        }
        return user;
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
