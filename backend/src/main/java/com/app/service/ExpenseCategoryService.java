package com.app.service;

import com.app.dto.ExpenseCategoryDto;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.CategoryType;
import com.app.entity.ExpenseCategory;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.ExpenseCategoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        Account account = new Account();
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

    @Transactional
    public void seedDefaultCategories(Account account) {
        if (!categoryRepository.findByAccountIdAndActiveTrue(account.getId()).isEmpty()) {
            return;
        }

        List<ExpenseCategory> categories = defaultCategoryNames(account.getAccountType()).stream()
                .map(name -> ExpenseCategory.builder()
                        .account(account)
                        .categoryName(name)
                        .accountType(account.getAccountType())
                        .categoryType(defaultCategoryType(account.getAccountType(), name))
                        .active(true)
                        .build())
                .collect(Collectors.toList());

        categoryRepository.saveAll(categories);
        log.info("Seeded {} default categories for account {}", categories.size(), account.getId());
    }

    private List<String> defaultCategoryNames(AccountType accountType) {
        return switch (accountType) {
            case INDIVIDUAL -> List.of(
                    "Food", "Grocery", "Rent", "Travel", "Fuel", "Shopping",
                    "Medical", "Education", "Bills", "Entertainment", "Miscellaneous");
            case SOCIETY -> List.of(
                    "Maintenance", "Security", "Cleaning", "Electricity", "Plumbing", "Lift",
                    "Garden", "Office/Admin", "Festival", "Sports", "Miscellaneous");
            case KIRANA_STORE -> List.of(
                    "Shop Rent", "Electricity", "Staff Salary", "Transport", "Packaging",
                    "Maintenance", "Miscellaneous");
        };
    }

    private CategoryType defaultCategoryType(AccountType accountType, String categoryName) {
        return switch (accountType) {
            case INDIVIDUAL -> CategoryType.PERSONAL;
            case SOCIETY -> switch (categoryName) {
                case "Festival" -> CategoryType.FESTIVAL;
                case "Sports" -> CategoryType.SPORTS;
                default -> CategoryType.SOCIETY_REGULAR;
            };
            case KIRANA_STORE -> CategoryType.STORE;
        };
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
