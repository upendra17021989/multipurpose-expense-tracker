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

    public AuthService(UserRepository userRepository, AccountRepository accountRepository,
                       PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (userRepository.findByMobile(request.getMobile()).isPresent()) {
            throw new ValidationException("Mobile number already registered");
        }

        if (request.getEmail() != null && userRepository.findByEmail(request.getEmail()).isPresent()) {
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
        Account account = buildInitialAccount(request, savedUser);
        accountRepository.save(account);
        log.info("User registered with ID: {}", savedUser.getId());

        return mapToUserDto(savedUser);
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

        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .user(mapToUserDto(user))
                .accounts(accounts.stream().map(this::mapToAccountDto).collect(Collectors.toList()))
                .build();
    }

    public LoginResponse loginWithAccount(LoginRequest request, Long accountId) {
        User user = userRepository.findByMobileAndActive(request.getMobile(), true)
                .orElseThrow(() -> new UnauthorizedException("Invalid mobile or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid mobile or password");
        }

        Account account = accountRepository.findByIdAndUserId(accountId, user.getId())
                .orElseThrow(() -> new ValidationException("Account not found or not accessible"));

        if (!account.getActive()) {
            throw new ValidationException("Account is inactive");
        }

        String token = tokenProvider.generateToken(user.getId(), account.getId());

        List<Account> accounts = accountRepository.findByUserIdAndActive(user.getId(), true);

        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .user(mapToUserDto(user))
                .accounts(accounts.stream().map(this::mapToAccountDto).collect(Collectors.toList()))
                .build();
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
