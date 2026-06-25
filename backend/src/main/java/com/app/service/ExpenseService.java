package com.app.service;

import com.app.dto.ExpenseCreateRequest;
import com.app.dto.ExpenseDto;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.Expense;
import com.app.entity.ExpenseCategory;
import com.app.entity.ExpenseStatus;
import com.app.entity.ExpenseType;
import com.app.entity.FestivalEvent;
import com.app.entity.PaymentMode;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.ExpenseCategoryRepository;
import com.app.repository.ExpenseRepository;
import com.app.repository.FestivalEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseCategoryRepository categoryRepository;
    private final AccountRepository accountRepository;
    private final FestivalEventRepository festivalEventRepository;

    public ExpenseService(ExpenseRepository expenseRepository,
                          ExpenseCategoryRepository categoryRepository,
                          AccountRepository accountRepository,
                          FestivalEventRepository festivalEventRepository) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.accountRepository = accountRepository;
        this.festivalEventRepository = festivalEventRepository;
    }

    public List<ExpenseDto> getExpensesByAccountId(Long accountId) {
        return expenseRepository.findByAccountIdAndSoftDeletedFalse(accountId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<ExpenseDto> getExpensesByDateRange(Long accountId, LocalDate startDate, LocalDate endDate) {
        return expenseRepository.findByAccountIdAndExpenseDateBetweenAndSoftDeletedFalse(accountId, startDate, endDate)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<ExpenseDto> getTodaysExpenses(Long accountId) {
        return expenseRepository.findTodaysExpenses(accountId, LocalDate.now())
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public ExpenseDto getExpenseById(Long accountId, Long expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        if (!expense.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Expense not accessible");
        }

        if (expense.getSoftDeleted()) {
            throw new ResourceNotFoundException("Expense has been deleted");
        }

        return mapToDto(expense);
    }

    public ExpenseDto createExpense(Long accountId, Long accountUserId, ExpenseCreateRequest request) {
        validateExpenseRequest(request);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        ExpenseCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (!category.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Category not accessible");
        }

        ExpenseType expenseType = request.getExpenseType() != null ? request.getExpenseType() : getDefaultExpenseType(category);
        validateExpenseType(account.getAccountType(), expenseType, request);
        FestivalEvent festivalEvent = resolveFestivalEvent(accountId, expenseType, request.getFestivalEventId());

        Expense expense = Expense.builder()
                .account(account)
                .accountType(account.getAccountType())
                .expenseDate(request.getExpenseDate())
                .category(category)
                .expenseType(expenseType)
                .festivalEvent(festivalEvent)
                .vendorName(request.getVendorName())
                .description(request.getDescription())
                .amount(request.getAmount())
                .paymentMode(request.getPaymentMode())
                .transactionId(request.getTransactionId())
                .utr(request.getUtr())
                .chequeNumber(request.getChequeNumber())
                .paidBy(String.valueOf(accountUserId))
                .remarks(request.getRemarks())
                .status(request.getStatus() != null ? request.getStatus() : ExpenseStatus.DRAFT)
                .softDeleted(false)
                .build();

        Expense savedExpense = expenseRepository.save(expense);
        refreshFestivalExpenseTotal(savedExpense.getFestivalEvent());
        log.info("Expense created with ID: {}", savedExpense.getId());

        return mapToDto(savedExpense);
    }

    public ExpenseDto updateExpense(Long accountId, Long expenseId, ExpenseCreateRequest request) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        if (!expense.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Expense not accessible");
        }

        if (expense.getSoftDeleted()) {
            throw new ValidationException("Cannot update deleted expense");
        }

        if (expense.getStatus() == ExpenseStatus.APPROVED) {
            throw new ValidationException("Cannot update approved expense");
        }

        validateExpenseRequest(request);
        FestivalEvent previousFestivalEvent = expense.getFestivalEvent();

        ExpenseCategory category = expense.getCategory();
        if (request.getCategoryId() != null && !request.getCategoryId().equals(expense.getCategory().getId())) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            if (!category.getAccount().getId().equals(accountId)) {
                throw new ResourceNotFoundException("Category not accessible");
            }
            expense.setCategory(category);
        }

        ExpenseType expenseType = request.getExpenseType() != null ? request.getExpenseType() : getDefaultExpenseType(category);
        validateExpenseType(expense.getAccountType(), expenseType, request);
        FestivalEvent festivalEvent = resolveFestivalEvent(accountId, expenseType, request.getFestivalEventId());

        expense.setAccountType(expense.getAccount().getAccountType());
        expense.setExpenseDate(request.getExpenseDate());
        expense.setExpenseType(expenseType);
        expense.setFestivalEvent(festivalEvent);
        expense.setAmount(request.getAmount());
        expense.setPaymentMode(request.getPaymentMode());
        expense.setVendorName(request.getVendorName());
        expense.setDescription(request.getDescription());
        expense.setTransactionId(request.getTransactionId());
        expense.setUtr(request.getUtr());
        expense.setChequeNumber(request.getChequeNumber());
        expense.setRemarks(request.getRemarks());
        if (request.getStatus() != null) {
            expense.setStatus(request.getStatus());
        }

        Expense updated = expenseRepository.save(expense);
        refreshFestivalExpenseTotal(previousFestivalEvent);
        refreshFestivalExpenseTotal(updated.getFestivalEvent());
        return mapToDto(updated);
    }

    public void deleteExpense(Long accountId, Long expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        if (!expense.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Expense not accessible");
        }

        if (expense.getSoftDeleted()) {
            throw new ValidationException("Expense already deleted");
        }

        FestivalEvent festivalEvent = expense.getFestivalEvent();
        expense.setSoftDeleted(true);
        expenseRepository.save(expense);
        refreshFestivalExpenseTotal(festivalEvent);
    }

    public void approveExpense(Long accountId, Long expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        if (!expense.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Expense not accessible");
        }

        if (expense.getStatus() != ExpenseStatus.SUBMITTED) {
            throw new ValidationException("Only submitted expenses can be approved");
        }

        expense.setStatus(ExpenseStatus.APPROVED);
        expenseRepository.save(expense);
    }

    public void rejectExpense(Long accountId, Long expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        if (!expense.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Expense not accessible");
        }

        if (expense.getStatus() != ExpenseStatus.SUBMITTED) {
            throw new ValidationException("Only submitted expenses can be rejected");
        }

        expense.setStatus(ExpenseStatus.REJECTED);
        expenseRepository.save(expense);
    }

    private void validateExpenseRequest(ExpenseCreateRequest request) {
        if (request.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Amount must be greater than 0");
        }

        if (request.getPaymentMode() == PaymentMode.UPI || request.getPaymentMode() == PaymentMode.NEFT) {
            if (request.getUtr() == null || request.getUtr().isEmpty()) {
                throw new ValidationException("UTR is required for UPI/NEFT payments");
            }
        }

        if (request.getPaymentMode() == PaymentMode.CHEQUE) {
            if (request.getChequeNumber() == null || request.getChequeNumber().isEmpty()) {
                throw new ValidationException("Cheque number is required for cheque payments");
            }
        }
    }

    private void validateExpenseType(AccountType accountType, ExpenseType expenseType, ExpenseCreateRequest request) {
        switch (accountType) {
            case INDIVIDUAL -> {
                if (expenseType != ExpenseType.PERSONAL) {
                    throw new ValidationException("Individual account expenses must be PERSONAL");
                }
            }
            case SOCIETY -> {
                if (expenseType != ExpenseType.SOCIETY_REGULAR && expenseType != ExpenseType.FESTIVAL && expenseType != ExpenseType.SPORTS) {
                    throw new ValidationException("Society expenses must be SOCIETY_REGULAR, FESTIVAL, or SPORTS");
                }
                if ((expenseType == ExpenseType.FESTIVAL || expenseType == ExpenseType.SPORTS) && request.getFestivalEventId() == null) {
                    throw new ValidationException("Festival or sports expenses require an event");
                }
            }
            case KIRANA_STORE -> {
                if (expenseType != ExpenseType.STORE_EXPENSE) {
                    throw new ValidationException("Kirana store expenses must be STORE_EXPENSE");
                }
            }
        }
    }

    private FestivalEvent resolveFestivalEvent(Long accountId, ExpenseType expenseType, Long festivalEventId) {
        if (expenseType != ExpenseType.FESTIVAL && expenseType != ExpenseType.SPORTS) {
            return null;
        }
        return festivalEventRepository.findByAccountIdAndId(accountId, festivalEventId)
                .orElseThrow(() -> new ResourceNotFoundException("Festival or sports event not found"));
    }

    private ExpenseDto mapToDto(Expense expense) {
        return ExpenseDto.builder()
                .id(expense.getId())
                .accountId(expense.getAccount().getId())
                .expenseDate(expense.getExpenseDate())
                .accountType(expense.getAccountType())
                .categoryId(expense.getCategory().getId())
                .categoryName(expense.getCategory().getCategoryName())
                .expenseType(expense.getExpenseType())
                .festivalEventId(expense.getFestivalEvent() != null ? expense.getFestivalEvent().getId() : null)
                .vendorName(expense.getVendorName())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .paymentMode(expense.getPaymentMode())
                .transactionId(expense.getTransactionId())
                .utr(expense.getUtr())
                .chequeNumber(expense.getChequeNumber())
                .paidBy(expense.getPaidBy())
                .approvedBy(expense.getApprovedBy())
                .receiptImageUrl(expense.getReceiptImageUrl())
                .remarks(expense.getRemarks())
                .status(expense.getStatus())
                .createdAt(expense.getCreatedAt())
                .build();
    }


    private void refreshFestivalExpenseTotal(FestivalEvent festivalEvent) {
        if (festivalEvent == null) {
            return;
        }

        BigDecimal totalExpense = expenseRepository
                .findByAccountIdAndFestivalEventIdAndSoftDeletedFalse(
                        festivalEvent.getAccount().getId(), festivalEvent.getId())
                .stream()
                .filter(expense -> expense.getExpenseType() == ExpenseType.FESTIVAL || expense.getExpenseType() == ExpenseType.SPORTS)
                .map(Expense::getAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        festivalEvent.setTotalExpense(totalExpense);
        festivalEventRepository.save(festivalEvent);
    }
    private ExpenseType getDefaultExpenseType(ExpenseCategory category) {
        return switch (category.getCategoryType()) {
            case PERSONAL -> ExpenseType.PERSONAL;
            case SOCIETY_REGULAR -> ExpenseType.SOCIETY_REGULAR;
            case FESTIVAL -> ExpenseType.FESTIVAL;
            case SPORTS -> ExpenseType.SPORTS;
            case STORE -> ExpenseType.STORE_EXPENSE;
        };
    }
}
