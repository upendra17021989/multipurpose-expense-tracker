package com.app.controller;

import com.app.dto.ExpenseCategoryDto;
import com.app.entity.CategoryType;
import com.app.security.UserPrincipal;
import com.app.service.ExpenseCategoryService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/expenses/categories")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class ExpenseCategoryController {

    private final ExpenseCategoryService categoryService;

    public ExpenseCategoryController(ExpenseCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ResponseEntity<List<ExpenseCategoryDto>> getCategories(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Fetching categories for account: {}", userPrincipal.getAccountId());
        List<ExpenseCategoryDto> categories = categoryService.getActiveCategories(userPrincipal.getAccountId());
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/type/{categoryType}")
    public ResponseEntity<List<ExpenseCategoryDto>> getCategoriesByType(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable CategoryType categoryType) {
        log.info("Fetching categories of type {} for account: {}", categoryType, userPrincipal.getAccountId());
        List<ExpenseCategoryDto> categories = categoryService.getCategoriesByType(userPrincipal.getAccountId(), categoryType);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{categoryId}")
    public ResponseEntity<ExpenseCategoryDto> getCategory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long categoryId) {
        log.info("Fetching category {} for account: {}", categoryId, userPrincipal.getAccountId());
        ExpenseCategoryDto category = categoryService.getCategoryById(userPrincipal.getAccountId(), categoryId);
        return ResponseEntity.ok(category);
    }

    @PostMapping
    public ResponseEntity<ExpenseCategoryDto> createCategory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody ExpenseCategoryDto dto) {
        log.info("Creating category for account: {}", userPrincipal.getAccountId());
        ExpenseCategoryDto created = categoryService.createCategory(userPrincipal.getAccountId(), dto);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<ExpenseCategoryDto> updateCategory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long categoryId,
            @Valid @RequestBody ExpenseCategoryDto dto) {
        log.info("Updating category {} for account: {}", categoryId, userPrincipal.getAccountId());
        ExpenseCategoryDto updated = categoryService.updateCategory(userPrincipal.getAccountId(), categoryId, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long categoryId) {
        log.info("Deleting category {} for account: {}", categoryId, userPrincipal.getAccountId());
        categoryService.deleteCategory(userPrincipal.getAccountId(), categoryId);
        return ResponseEntity.noContent().build();
    }
}
