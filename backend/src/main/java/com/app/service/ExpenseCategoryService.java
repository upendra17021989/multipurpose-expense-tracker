package com.app.service;

import com.app.dto.ExpenseCategoryDto;
import com.app.entity.ExpenseCategory;
import com.app.entity.CategoryType;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.ExpenseCategoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ExpenseCategoryService {

    private final ExpenseCategoryRepository categoryRepository;

    public ExpenseCategoryService(ExpenseCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<ExpenseCategoryDto> getActiveCategories(Long accountId) {
        return categoryRepository.findByAccountIdAndActiveTrue(accountId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<ExpenseCategoryDto> getCategoriesByType(Long accountId, CategoryType categoryType) {
        return categoryRepository.findByAccountIdAndCategoryTypeAndActiveTrue(accountId, categoryType)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public ExpenseCategoryDto getCategoryById(Long accountId, Long categoryId) {
        ExpenseCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (!category.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Category not accessible");
        }

        return mapToDto(category);
    }

    public ExpenseCategoryDto createCategory(Long accountId, ExpenseCategoryDto dto) {
        com.app.entity.Account account = new com.app.entity.Account();
        account.setId(accountId);

        ExpenseCategory category = ExpenseCategory.builder()
                .account(account)
                .categoryName(dto.getCategoryName())
                .accountType(dto.getAccountType())
                .categoryType(dto.getCategoryType())
                .active(true)
                .build();

        ExpenseCategory savedCategory = categoryRepository.save(category);
        return mapToDto(savedCategory);
    }

    public ExpenseCategoryDto updateCategory(Long accountId, Long categoryId, ExpenseCategoryDto dto) {
        ExpenseCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (!category.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Category not accessible");
        }

        category.setCategoryName(dto.getCategoryName());
        category.setActive(dto.getActive());

        ExpenseCategory updated = categoryRepository.save(category);
        return mapToDto(updated);
    }

    public void deleteCategory(Long accountId, Long categoryId) {
        ExpenseCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (!category.getAccount().getId().equals(accountId)) {
            throw new ResourceNotFoundException("Category not accessible");
        }

        category.setActive(false);
        categoryRepository.save(category);
    }

    private ExpenseCategoryDto mapToDto(ExpenseCategory category) {
        return ExpenseCategoryDto.builder()
                .id(category.getId())
                .accountId(category.getAccount().getId())
                .categoryName(category.getCategoryName())
                .accountType(category.getAccountType())
                .categoryType(category.getCategoryType())
                .active(category.getActive())
                .createdAt(category.getCreatedAt())
                .build();
    }
}
