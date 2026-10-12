package com.app.repository;

import com.app.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect", "logging.level.org.hibernate.SQL=WARN",
        "debug=false", "spring.profiles.active=test", "spring.config.import=", "logging.level.root=WARN",
        "logging.level.org.springframework=WARN", "spring.datasource.url=jdbc:h2:mem:chat-query;NON_KEYWORDS=YEAR,MONTH",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.properties.hibernate.hbm2ddl.halt_on_error=true"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = ChatExpenseQueryTest.JpaConfiguration.class)
class ChatExpenseQueryTest {
    @Configuration
    @EntityScan(basePackages = "com.app.entity")
    @EnableJpaRepositories(basePackages = "com.app.repository", includeFilters =
            @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = ExpenseRepository.class))
    static class JpaConfiguration {}
    @Autowired TestEntityManager entityManager;
    @Autowired ExpenseRepository repository;

    @Test void aggregateExcludesOtherAccountsDeletedRejectedAndOutOfMonthEntries() {
        User user = entityManager.persist(User.builder().name("Test").mobile("1234567890").passwordHash("unused").build());
        Account first = entityManager.persist(Account.builder().user(user).accountType(AccountType.INDIVIDUAL).accountName("First").build());
        Account other = entityManager.persist(Account.builder().user(user).accountType(AccountType.INDIVIDUAL).accountName("Other").build());
        ExpenseCategory category = entityManager.persist(ExpenseCategory.builder().account(first).accountType(AccountType.INDIVIDUAL)
                .categoryName("Food").categoryType(CategoryType.PERSONAL).build());
        save(first, category, "0.10", ExpenseStatus.DRAFT, false, "2026-10-01");
        save(first, category, "0.20", ExpenseStatus.PAID, false, "2026-10-31");
        save(first, category, "500", ExpenseStatus.REJECTED, false, "2026-10-12");
        save(first, category, "600", ExpenseStatus.PAID, true, "2026-10-12");
        save(first, category, "700", ExpenseStatus.PAID, false, "2026-09-30");
        save(other, category, "800", ExpenseStatus.PAID, false, "2026-10-12");
        entityManager.flush(); entityManager.clear();
        var rows = repository.summarizeForChat(first.getId(), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31));
        assertEquals(1, rows.size());
        assertEquals(0, new BigDecimal("0.30").compareTo(rows.get(0).getAmount()));
        assertEquals(2L, rows.get(0).getEntryCount());
    }

    private void save(Account account, ExpenseCategory category, String amount, ExpenseStatus status, boolean deleted, String date) {
        entityManager.persist(Expense.builder().account(account).accountType(AccountType.INDIVIDUAL).category(category)
                .expenseDate(LocalDate.parse(date)).expenseType(ExpenseType.PERSONAL).amount(new BigDecimal(amount))
                .paymentMode(PaymentMode.CASH).paidBy("test").status(status).softDeleted(deleted).build());
    }
}
