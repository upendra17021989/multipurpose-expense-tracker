package com.app.controller;

import com.app.dto.ExpenseCreateRequest;
import com.app.dto.ExpenseDto;
import com.app.security.UserPrincipal;
import com.app.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/expenses")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping
    public ResponseEntity<List<ExpenseDto>> getExpenses(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Fetching all expenses for account: {}", userPrincipal.getAccountId());
        List<ExpenseDto> expenses = expenseService.getExpensesByAccountId(userPrincipal.getAccountId());
        return ResponseEntity.ok(expenses);
    }

    @GetMapping("/today")
    public ResponseEntity<List<ExpenseDto>> getTodaysExpenses(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Fetching today's expenses for account: {}", userPrincipal.getAccountId());
        List<ExpenseDto> expenses = expenseService.getTodaysExpenses(userPrincipal.getAccountId());
        return ResponseEntity.ok(expenses);
    }

    @GetMapping("/range")
    public ResponseEntity<List<ExpenseDto>> getExpensesByDateRange(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("Fetching expenses for date range: {} to {} for account: {}", startDate, endDate, userPrincipal.getAccountId());
        List<ExpenseDto> expenses = expenseService.getExpensesByDateRange(userPrincipal.getAccountId(), startDate, endDate);
        return ResponseEntity.ok(expenses);
    }

    @GetMapping("/{expenseId}")
    public ResponseEntity<ExpenseDto> getExpense(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long expenseId) {
        log.info("Fetching expense {} for account: {}", expenseId, userPrincipal.getAccountId());
        ExpenseDto expense = expenseService.getExpenseById(userPrincipal.getAccountId(), expenseId);
        return ResponseEntity.ok(expense);
    }

    @PostMapping
    public ResponseEntity<ExpenseDto> createExpense(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody ExpenseCreateRequest request) {
        log.info("Creating expense for account: {}", userPrincipal.getAccountId());
        ExpenseDto created = expenseService.createExpense(userPrincipal.getAccountId(), userPrincipal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{expenseId}")
    public ResponseEntity<ExpenseDto> updateExpense(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long expenseId,
            @Valid @RequestBody ExpenseCreateRequest request) {
        log.info("Updating expense {} for account: {}", expenseId, userPrincipal.getAccountId());
        ExpenseDto updated = expenseService.updateExpense(userPrincipal.getAccountId(), expenseId, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long expenseId) {
        log.info("Deleting expense {} for account: {}", expenseId, userPrincipal.getAccountId());
        expenseService.deleteExpense(userPrincipal.getAccountId(), expenseId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{expenseId}/approve")
    public ResponseEntity<Void> approveExpense(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long expenseId) {
        log.info("Approving expense {} for account: {}", expenseId, userPrincipal.getAccountId());
        expenseService.approveExpense(userPrincipal.getAccountId(), expenseId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{expenseId}/reject")
    public ResponseEntity<Void> rejectExpense(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long expenseId) {
        log.info("Rejecting expense {} for account: {}", expenseId, userPrincipal.getAccountId());
        expenseService.rejectExpense(userPrincipal.getAccountId(), expenseId);
        return ResponseEntity.ok().build();
    }
}
