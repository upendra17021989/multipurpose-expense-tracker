package com.app.service;

import com.app.dto.PersonalBudgetCreateRequest;
import com.app.dto.PersonalBudgetDto;
import com.app.entity.PersonalBudget;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.PersonalBudgetRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PersonalBudgetService {

    private final PersonalBudgetRepository budgetRepository;

    public PersonalBudgetService(PersonalBudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    public List<PersonalBudgetDto> getBudgetsByAccountId(Long accountId) {
        return budgetRepository.findByAccountId(accountId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public PersonalBudgetDto getCurrentMonthBudget(Long accountId) {
        LocalDate now = LocalDate.now();
        return budgetRepository.findByAccountIdAndMonthAndYear(accountId, now.getMonthValue(), now.getYear())
                .map(this::mapToDto)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found for current month"));
    }

    public PersonalBudgetDto getBudgetByMonthYear(Long accountId, Integer month, Integer year) {
        return budgetRepository.findByAccountIdAndMonthAndYear(accountId, month, year)
                .map(this::mapToDto)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));
    }

    public PersonalBudgetDto createBudget(Long accountId, PersonalBudgetCreateRequest request) {
        validateBudgetRequest(request);

        budgetRepository.findByAccountIdAndMonthAndYear(accountId, request.getMonth(), request.getYear())
                .ifPresent(budget -> {
                    throw new ValidationException("Budget already exists for this month/year");
                });

        com.app.entity.Account account = new com.app.entity.Account();
        account.setId(accountId);

        PersonalBudget budget = PersonalBudget.builder()
                .account(account)
                .month(request.getMonth())
                .year(request.getYear())
                .monthlyBudget(request.getMonthlyBudget())
                .monthlySavingsTarget(request.getMonthlySavingsTarget())
                .alertEnabled(true)
                .build();

        PersonalBudget savedBudget = budgetRepository.save(budget);
        log.info("Budget created for month {}/{} with ID: {}", request.getMonth(), request.getYear(), savedBudget.getId());

        return mapToDto(savedBudget);
    }

    public PersonalBudgetDto updateBudget(Long accountId, Long budgetId, PersonalBudgetCreateRequest request) {
        validateBudgetRequest(request);

        PersonalBudget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        if (!budget.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Budget not accessible");
        }

        budget.setMonthlyBudget(request.getMonthlyBudget());
        budget.setMonthlySavingsTarget(request.getMonthlySavingsTarget());

        PersonalBudget updated = budgetRepository.save(budget);
        return mapToDto(updated);
    }

    public void deleteBudget(Long accountId, Long budgetId) {
        PersonalBudget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        if (!budget.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Budget not accessible");
        }

        budgetRepository.delete(budget);
    }

    private void validateBudgetRequest(PersonalBudgetCreateRequest request) {
        if (request.getMonth() == null) {
            throw new ValidationException("Month is required");
        }
        if (request.getMonth() < 1 || request.getMonth() > 12) {
            throw new ValidationException("Month must be between 1 and 12");
        }
        if (request.getYear() == null) {
            throw new ValidationException("Year is required");
        }
        if (request.getYear() < 2020 || request.getYear() > 2100) {
            throw new ValidationException("Year must be valid");
        }
        if (request.getMonthlyBudget() == null || request.getMonthlyBudget().compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Monthly budget must be zero or greater");
        }
        if (request.getMonthlySavingsTarget() != null && request.getMonthlySavingsTarget().compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Monthly savings target must be zero or greater");
        }
    }

    private PersonalBudgetDto mapToDto(PersonalBudget budget) {
        return PersonalBudgetDto.builder()
                .id(budget.getId())
                .accountId(budget.getAccount().getId())
                .month(budget.getMonth())
                .year(budget.getYear())
                .monthlyBudget(budget.getMonthlyBudget())
                .monthlySavingsTarget(budget.getMonthlySavingsTarget())
                .alertEnabled(budget.getAlertEnabled())
                .createdAt(budget.getCreatedAt())
                .build();
    }
}
