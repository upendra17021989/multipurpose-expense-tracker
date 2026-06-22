package com.app.controller;

import com.app.dto.PersonalBudgetCreateRequest;
import com.app.dto.PersonalBudgetDto;
import com.app.exception.ResourceNotFoundException;
import com.app.security.UserPrincipal;
import com.app.service.PersonalBudgetService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/personal-budgets")
public class PersonalBudgetController {

    private final PersonalBudgetService personalBudgetService;

    public PersonalBudgetController(PersonalBudgetService personalBudgetService) {
        this.personalBudgetService = personalBudgetService;
    }

    @GetMapping
    public ResponseEntity<List<PersonalBudgetDto>> getBudgets(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Fetching personal budgets for account: {}", userPrincipal.getAccountId());
        return ResponseEntity.ok(personalBudgetService.getBudgetsByAccountId(userPrincipal.getAccountId()));
    }

    @GetMapping("/current")
    public ResponseEntity<PersonalBudgetDto> getCurrentMonthBudget(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Fetching current month budget for account: {}", userPrincipal.getAccountId());
        try {
            return ResponseEntity.ok(personalBudgetService.getCurrentMonthBudget(userPrincipal.getAccountId()));
        } catch (ResourceNotFoundException ex) {
            return ResponseEntity.noContent().build();
        }
    }

    @GetMapping("/lookup")
    public ResponseEntity<PersonalBudgetDto> getBudgetByMonthYear(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        log.info("Fetching budget for {}/{} and account: {}", month, year, userPrincipal.getAccountId());
        return ResponseEntity.ok(personalBudgetService.getBudgetByMonthYear(userPrincipal.getAccountId(), month, year));
    }

    @PostMapping
    public ResponseEntity<PersonalBudgetDto> createBudget(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody PersonalBudgetCreateRequest request) {
        log.info("Creating personal budget for account: {}", userPrincipal.getAccountId());
        PersonalBudgetDto created = personalBudgetService.createBudget(userPrincipal.getAccountId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{budgetId}")
    public ResponseEntity<PersonalBudgetDto> updateBudget(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long budgetId,
            @Valid @RequestBody PersonalBudgetCreateRequest request) {
        log.info("Updating personal budget {} for account: {}", budgetId, userPrincipal.getAccountId());
        return ResponseEntity.ok(personalBudgetService.updateBudget(userPrincipal.getAccountId(), budgetId, request));
    }

    @DeleteMapping("/{budgetId}")
    public ResponseEntity<Void> deleteBudget(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long budgetId) {
        log.info("Deleting personal budget {} for account: {}", budgetId, userPrincipal.getAccountId());
        personalBudgetService.deleteBudget(userPrincipal.getAccountId(), budgetId);
        return ResponseEntity.noContent().build();
    }
}
