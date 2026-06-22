package com.app.service;

import com.app.dto.AccountDto;
import com.app.dto.LoginRequest;
import com.app.dto.LoginResponse;
import com.app.dto.RegisterRequest;
import com.app.dto.UserDto;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.User;
import com.app.entity.UserRole;
import com.app.exception.UnauthorizedException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.UserRepository;
import com.app.util.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final ExpenseCategoryService expenseCategoryService;

    public AuthService(UserRepository userRepository, AccountRepository accountRepository,
                       PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider,
                       ExpenseCategoryService expenseCategoryService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.expenseCategoryService = expenseCategoryService;
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        User user = userRepository.findByMobile(request.getMobile())
                .map(existingUser -> validateExistingUserForNewAccount(existingUser, request))
                .orElseGet(() -> createUser(request));

        Account account = buildInitialAccount(request, user);
        Account savedAccount = accountRepository.save(account);
        expenseCategoryService.seedDefaultCategories(savedAccount);
        log.info("Account {} created for user ID: {}", savedAccount.getId(), user.getId());

        return mapToUserDto(user);
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByMobileAndActive(request.getMobile(), true)
                .orElseThrow(() -> new UnauthorizedException("Invalid mobile or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid mobile or password");
        }

        List<Account> accounts = accountRepository.findByUserIdAndActive(user.getId(), true);

        if (accounts.isEmpty()) {
            throw new ValidationException("No active account found for this user");
        }

        Account firstAccount = accounts.get(0);
        String token = tokenProvider.generateToken(user.getId(), firstAccount.getId());

        return buildLoginResponse(user, accounts, firstAccount, token);
    }

    public LoginResponse loginWithAccount(LoginRequest request, Long accountId) {
        User user = userRepository.findByMobileAndActive(request.getMobile(), true)
                .orElseThrow(() -> new UnauthorizedException("Invalid mobile or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid mobile or password");
        }

        return buildAccountLoginResponse(user, accountId);
    }

    public LoginResponse switchAccount(Long userId, Long accountId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        return buildAccountLoginResponse(user, accountId);
    }

    private LoginResponse buildAccountLoginResponse(User user, Long accountId) {
        Account account = accountRepository.findByIdAndUserId(accountId, user.getId())
                .orElseThrow(() -> new ValidationException("Account not found or not accessible"));

        if (!account.getActive()) {
            throw new ValidationException("Account is inactive");
        }

        List<Account> accounts = accountRepository.findByUserIdAndActive(user.getId(), true);
        String token = tokenProvider.generateToken(user.getId(), account.getId());
        return buildLoginResponse(user, accounts, account, token);
    }

    private LoginResponse buildLoginResponse(User user, List<Account> accounts, Account currentAccount, String token) {
        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .user(mapToUserDto(user))
                .accounts(accounts.stream().map(this::mapToAccountDto).collect(Collectors.toList()))
                .currentAccount(mapToAccountDto(currentAccount))
                .build();
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
        return AccountDto.builder()
                .id(account.getId())
                .userId(account.getUser().getId())
                .accountType(account.getAccountType())
                .accountName(account.getAccountName())
                .address(account.getAddress())
                .societyName(account.getSocietyName())
                .storeName(account.getStoreName())
                .role(account.getRole())
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
            case INDIVIDUAL -> UserRole.OWNER;
        };
    }
}
