package com.app.service;

import com.app.dto.FestivalEventCreateRequest;
import com.app.dto.FestivalEventDto;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.FestivalEvent;
import com.app.entity.FestivalEventStatus;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.FestivalEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class FestivalEventService {

    private final FestivalEventRepository festivalEventRepository;
    private final AccountRepository accountRepository;

    public FestivalEventService(FestivalEventRepository festivalEventRepository, AccountRepository accountRepository) {
        this.festivalEventRepository = festivalEventRepository;
        this.accountRepository = accountRepository;
    }

    public List<FestivalEventDto> getFestivalEvents(Long accountId, Integer year) {
        List<FestivalEvent> events = year != null
                ? festivalEventRepository.findByAccountIdAndYear(accountId, year)
                : festivalEventRepository.findByAccountId(accountId);
        return events.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public FestivalEventDto getFestivalEvent(Long accountId, Long festivalEventId) {
        return mapToDto(findAccessibleEvent(accountId, festivalEventId));
    }

    public FestivalEventDto createFestivalEvent(Long accountId, FestivalEventCreateRequest request) {
        validateRequest(request);
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        if (account.getAccountType() != AccountType.SOCIETY) {
            throw new ValidationException("Festival events are available only for society accounts");
        }

        FestivalEvent event = FestivalEvent.builder()
                .account(account)
                .festivalName(request.getFestivalName().trim())
                .year(request.getYear())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .budgetAmount(request.getBudgetAmount())
                .collectedAmount(BigDecimal.ZERO)
                .totalExpense(BigDecimal.ZERO)
                .status(FestivalEventStatus.PLANNED)
                .build();

        FestivalEvent saved = festivalEventRepository.save(event);
        log.info("Festival event created with ID: {}", saved.getId());
        return mapToDto(saved);
    }

    public FestivalEventDto updateFestivalEvent(Long accountId, Long festivalEventId, FestivalEventCreateRequest request) {
        validateRequest(request);
        FestivalEvent event = findAccessibleEvent(accountId, festivalEventId);
        event.setFestivalName(request.getFestivalName().trim());
        event.setYear(request.getYear());
        event.setStartDate(request.getStartDate());
        event.setEndDate(request.getEndDate());
        event.setBudgetAmount(request.getBudgetAmount());
        return mapToDto(festivalEventRepository.save(event));
    }

    public FestivalEventDto updateStatus(Long accountId, Long festivalEventId, FestivalEventStatus status) {
        if (status == null) {
            throw new ValidationException("Festival status is required");
        }
        FestivalEvent event = findAccessibleEvent(accountId, festivalEventId);
        event.setStatus(status);
        return mapToDto(festivalEventRepository.save(event));
    }

    public void deleteFestivalEvent(Long accountId, Long festivalEventId) {
        FestivalEvent event = findAccessibleEvent(accountId, festivalEventId);
        festivalEventRepository.delete(event);
    }

    private FestivalEvent findAccessibleEvent(Long accountId, Long festivalEventId) {
        return festivalEventRepository.findByAccountIdAndId(accountId, festivalEventId)
                .orElseThrow(() -> new ResourceNotFoundException("Festival event not found"));
    }

    private void validateRequest(FestivalEventCreateRequest request) {
        if (request.getFestivalName() == null || request.getFestivalName().isBlank()) {
            throw new ValidationException("Festival name is required");
        }
        if (request.getYear() == null || request.getYear() < 2020 || request.getYear() > 2100) {
            throw new ValidationException("Year must be valid");
        }
        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();
        if (startDate == null) {
            throw new ValidationException("Start date is required");
        }
        if (endDate == null) {
            throw new ValidationException("End date is required");
        }
        if (endDate.isBefore(startDate)) {
            throw new ValidationException("End date cannot be before start date");
        }
        if (request.getBudgetAmount() != null && request.getBudgetAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Budget amount must be zero or greater");
        }
    }

    private FestivalEventDto mapToDto(FestivalEvent event) {
        return FestivalEventDto.builder()
                .id(event.getId())
                .accountId(event.getAccount().getId())
                .festivalName(event.getFestivalName())
                .year(event.getYear())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .budgetAmount(event.getBudgetAmount())
                .collectedAmount(event.getCollectedAmount())
                .totalExpense(event.getTotalExpense())
                .balanceAmount(event.getBalanceAmount())
                .status(event.getStatus())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
