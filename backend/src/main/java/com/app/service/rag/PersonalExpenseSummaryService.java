package com.app.service.rag;

import com.app.dto.ChatResponse;
import com.app.entity.AccountType;
import com.app.repository.AccountRepository;
import com.app.repository.ExpenseRepository;
import com.app.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class PersonalExpenseSummaryService {
    private final AccountRepository accounts;
    private final ExpenseRepository expenses;

    public PersonalExpenseSummaryService(AccountRepository accounts, ExpenseRepository expenses) {
        this.accounts = accounts; this.expenses = expenses;
    }

    @Transactional(readOnly = true)
    public ChatResponse summarize(UserPrincipal principal, String monthValue) {
        if (principal == null || principal.getAccountId() == null || principal.getUserId() == null)
            throw new ChatException(HttpStatus.FORBIDDEN, "Select an active individual workspace to get an expense summary.");
        var account = accounts.findById(principal.getAccountId()).orElse(null);
        if (account == null || !Boolean.TRUE.equals(account.getActive())
                || account.getAccountType() != AccountType.INDIVIDUAL
                || account.getUser() == null || !principal.getUserId().equals(account.getUser().getId())) {
            throw new ChatException(HttpStatus.FORBIDDEN,
                    "Expense summaries are available only to the owner of an active individual workspace.");
        }
        YearMonth month;
        try {
            if (monthValue == null || monthValue.isBlank()) month = YearMonth.now(ZoneId.of("Asia/Kolkata"));
            else {
                if (!monthValue.matches("\\d{4}-\\d{2}")) throw new DateTimeParseException("month", monthValue, 0);
                month = YearMonth.parse(monthValue);
            }
            if (month.getYear() < 2000 || month.getYear() > 2100)
                throw new DateTimeParseException("year", month.toString(), 0);
        } catch (DateTimeParseException ex) {
            throw new ChatException(HttpStatus.BAD_REQUEST, "Select a month between 2000-01 and 2100-12 (YYYY-MM).");
        }
        var rows = expenses.summarizeForChat(account.getId(), month.atDay(1), month.atEndOfMonth());
        BigDecimal total = rows.stream().map(ExpenseRepository.ChatCategoryTotal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long count = rows.stream().mapToLong(ExpenseRepository.ChatCategoryTotal::getEntryCount).sum();
        var categories = rows.stream().map(row -> new ChatResponse.CategoryTotal(row.getCategory(), row.getAmount())).toList();
        String scope = "Recorded personal expenses in the selected month, including draft, submitted, approved and paid entries. "
                + "Deleted and rejected entries are excluded. Shared group expenses and bank balances are not included.";
        String answer = count == 0 ? "No matching personal expenses were recorded for " + month + "."
                : "Your recorded personal expenses for " + month + " total INR " + total.toPlainString()
                    + " across " + count + " entries.";
        return new ChatResponse(answer, "LIVE_DATA",
                List.of(new ChatResponse.Source("personal-expenses", "Personal expenses", "/personal/expenses")),
                new ChatResponse.Summary(month.atDay(1), month.atEndOfMonth(), total, count, categories, scope));
    }
}
