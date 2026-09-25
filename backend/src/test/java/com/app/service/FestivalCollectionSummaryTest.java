package com.app.service;

import com.app.dto.FestivalCollectionSummaryDto;
import com.app.repository.ExpenseRepository;
import com.app.repository.FestivalCollectionRepository;
import com.app.repository.FestivalOtherCollectionRepository;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.sql.init.mode=never",
        "spring.config.import=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "logging.level.root=WARN",
        "logging.level.org.springframework=WARN",
        "logging.level.org.hibernate=WARN",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
@ContextConfiguration(classes = FestivalCollectionSummaryTest.JpaConfiguration.class)
class FestivalCollectionSummaryTest {
    @Configuration
    @EntityScan("com.app.entity")
    @EnableJpaRepositories("com.app.repository")
    static class JpaConfiguration {
    }

    @Autowired FestivalCollectionRepository collections;
    @Autowired FestivalOtherCollectionRepository otherCollections;
    @Autowired ExpenseRepository expenses;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManagerFactory entityManagerFactory;

    private FestivalCollectionService service;

    @BeforeEach
    void setUp() {
        // Only the columns read by the aggregates are needed. No production database is used.
        jdbc.execute("CREATE TABLE IF NOT EXISTS flats (id BIGINT PRIMARY KEY, block_name VARCHAR(100))");
        jdbc.execute("CREATE TABLE IF NOT EXISTS festival_collections (id BIGINT PRIMARY KEY, account_id BIGINT, festival_event_id BIGINT, flat_id BIGINT, expected_amount DECIMAL(10,2), collected_amount DECIMAL(10,2), pending_amount DECIMAL(10,2), excess_amount DECIMAL(10,2), refunded_amount DECIMAL(10,2), payment_status VARCHAR(30))");
        jdbc.execute("CREATE TABLE IF NOT EXISTS festival_other_collections (id BIGINT PRIMARY KEY, account_id BIGINT, festival_event_id BIGINT, contribution_kind VARCHAR(30), amount DECIMAL(10,2))");
        jdbc.execute("CREATE TABLE IF NOT EXISTS expenses (id BIGINT PRIMARY KEY, account_id BIGINT, festival_event_id BIGINT, amount DECIMAL(10,2), status VARCHAR(30), soft_deleted BOOLEAN)");
        service = new FestivalCollectionService(collections, null, otherCollections, null, null, null, null, expenses);
    }

    @Test
    void aggregatesTotalsWithoutLoadingEntitiesAndKeepsAccountAndEventIsolation() {
        jdbc.execute("INSERT INTO flats VALUES (1, 'A'), (2, 'A'), (3, 'B'), (4, NULL)");
        jdbc.execute("INSERT INTO festival_collections VALUES " +
                "(1, 1, 4, 1, 100, 100, 0, 0, 0, 'PAID')," +
                "(2, 1, 4, 2, 100, 0, 100, 0, 0, 'PENDING')," +
                "(3, 1, 4, 3, 100, 40, 60, 0, 0, 'PARTIAL')," +
                "(4, 1, 4, 4, 100, 125, 0, 25, 5, 'EXCESS')," +
                "(5, 2, 4, 1, 999, 999, 0, 0, 0, 'PAID')," +
                "(6, 1, 5, 1, 999, 999, 0, 0, 0, 'PAID')");
        jdbc.execute("INSERT INTO festival_other_collections VALUES " +
                "(1, 1, 4, 'MONETARY', 50), (2, 1, 4, 'IN_KIND', 900)," +
                "(3, 1, 4, 'IN_KIND', NULL), (4, 2, 4, 'MONETARY', 999), (5, 1, 5, 'MONETARY', 999)");
        jdbc.execute("INSERT INTO expenses VALUES " +
                "(1, 1, 4, 30, 'PAID', FALSE), (2, 1, 4, 20, 'DRAFT', FALSE)," +
                "(3, 1, 4, 999, 'PAID', TRUE), (4, 2, 4, 999, 'PAID', FALSE), (5, 1, 5, 999, 'PAID', FALSE)");

        var stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        FestivalCollectionSummaryDto summary = service.getSummary(1L, 4L);

        assertEquals(4L, summary.getFestivalEventId());
        money("400", summary.getTotalExpected());
        money("265", summary.getFlatCollected());
        money("50", summary.getOtherCollected());
        money("315", summary.getTotalCollected());
        money("160", summary.getTotalPending());
        money("25", summary.getTotalExcess());
        money("5", summary.getTotalRefunded());
        assertEquals(1, summary.getPaidFlats());
        assertEquals(1, summary.getPendingFlats());
        assertEquals(1, summary.getPartialFlats());
        assertEquals(1, summary.getExcessFlats());
        assertEquals(4, summary.getTotalFlats());
        assertEquals(2, summary.getTotalBlocks());
        assertEquals(3, summary.getOtherCollectionsCount());
        assertEquals(2, summary.getExpenseCount());
        money("30", summary.getPaidExpenses());
        money("50", summary.getRecordedExpenses());
        assertEquals(1, stats.getPrepareStatementCount());
        assertEquals(0, stats.getEntityLoadCount());
    }

    @Test
    void eventWithoutFlatDemandStillIncludesContributionsAndExpenses() {
        jdbc.execute("INSERT INTO festival_other_collections VALUES (1, 1, 4, 'MONETARY', 75)");
        jdbc.execute("INSERT INTO expenses VALUES (1, 1, 4, 25, 'PAID', FALSE)");

        var summary = service.getSummary(1L, 4L);

        assertEquals(0, summary.getTotalFlats());
        money("0", summary.getFlatCollected());
        money("75", summary.getOtherCollected());
        money("75", summary.getTotalCollected());
        assertEquals(1, summary.getOtherCollectionsCount());
        assertEquals(1, summary.getExpenseCount());
        money("25", summary.getPaidExpenses());
        money("25", summary.getRecordedExpenses());
    }

    @Test
    void emptyEventReturnsZeros() {
        var summary = service.getSummary(1L, 404L);
        money("0", summary.getTotalExpected());
        money("0", summary.getFlatCollected());
        money("0", summary.getOtherCollected());
        money("0", summary.getTotalCollected());
        money("0", summary.getTotalPending());
        money("0", summary.getTotalExcess());
        money("0", summary.getTotalRefunded());
        money("0", summary.getPaidExpenses());
        money("0", summary.getRecordedExpenses());
        assertEquals(0, summary.getTotalFlats());
        assertEquals(0, summary.getTotalBlocks());
        assertEquals(0, summary.getPaidFlats());
        assertEquals(0, summary.getPendingFlats());
        assertEquals(0, summary.getPartialFlats());
        assertEquals(0, summary.getExcessFlats());
        assertEquals(0, summary.getOtherCollectionsCount());
        assertEquals(0, summary.getExpenseCount());
    }

    private static void money(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual));
    }
}
