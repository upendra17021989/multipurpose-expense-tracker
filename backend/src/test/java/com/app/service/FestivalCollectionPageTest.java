package com.app.service;

import com.app.entity.PaymentStatus;
import com.app.repository.FestivalCollectionRepository;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.sql.init.mode=never",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
@ContextConfiguration(classes = FestivalCollectionSummaryTest.JpaConfiguration.class)
class FestivalCollectionPageTest {
    @Autowired FestivalCollectionRepository collections;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManagerFactory entityManagerFactory;
    private FestivalCollectionService service;

    @BeforeEach
    void setUp() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS flats (id BIGINT PRIMARY KEY, block_name VARCHAR(100), flat_number VARCHAR(100), owner_name VARCHAR(100))");
        jdbc.execute("CREATE TABLE IF NOT EXISTS festival_events (id BIGINT PRIMARY KEY, festival_name VARCHAR(100))");
        jdbc.execute("CREATE TABLE IF NOT EXISTS festival_collections (id BIGINT PRIMARY KEY, account_id BIGINT, festival_event_id BIGINT, flat_id BIGINT, expected_amount DECIMAL(10,2), collected_amount DECIMAL(10,2), pending_amount DECIMAL(10,2), excess_amount DECIMAL(10,2), refunded_amount DECIMAL(10,2), payment_status VARCHAR(30), remarks VARCHAR(100), created_at TIMESTAMP, updated_at TIMESTAMP)");
        jdbc.execute("INSERT INTO festival_events VALUES (4, 'Festival'), (5, 'Other event')");
        for (int i = 1; i <= 102; i++) {
            jdbc.update("INSERT INTO flats VALUES (?, 'A', ?, 'Owner')", i, String.format("%03d", i));
            jdbc.update("INSERT INTO festival_collections VALUES (?, ?, ?, ?, 100, 40, 60, 0, 0, 'PARTIAL', 'Note', TIMESTAMP '2026-01-01 10:00:00', TIMESTAMP '2026-01-02 10:00:00')",
                    i, i == 101 ? 2 : 1, i == 102 ? 5 : 4, i);
        }
        service = new FestivalCollectionService(collections, null, null, null, null, null, null, null);
    }

    @Test
    void hundredRowsUseOnlyPageAndCountQueriesAndPreserveDtoFields() {
        var stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();

        var page = service.getCollectionsPage(1L, 4L, "", "", "", 0, 100);

        assertEquals(100, page.getNumberOfElements());
        assertEquals(100, page.getTotalElements());
        assertEquals(1, page.getTotalPages());
        var first = page.getContent().get(0);
        assertEquals(1L, first.getId());
        assertEquals(1L, first.getAccountId());
        assertEquals(4L, first.getFestivalEventId());
        assertEquals("Festival", first.getFestivalName());
        assertEquals(1L, first.getFlatId());
        assertEquals("A", first.getBlockName());
        assertEquals("001", first.getFlatNumber());
        assertEquals("Owner", first.getOwnerName());
        assertEquals(new BigDecimal("100.00"), first.getExpectedAmount());
        assertEquals(new BigDecimal("40.00"), first.getCollectedAmount());
        assertEquals(new BigDecimal("60.00"), first.getPendingAmount());
        assertEquals(new BigDecimal("0.00"), first.getExcessAmount());
        assertEquals(new BigDecimal("0.00"), first.getRefundedAmount());
        assertEquals(PaymentStatus.PARTIAL, first.getPaymentStatus());
        assertEquals("Note", first.getRemarks());
        assertEquals(LocalDateTime.of(2026, 1, 1, 10, 0), first.getCreatedAt());
        assertEquals(LocalDateTime.of(2026, 1, 2, 10, 0), first.getUpdatedAt());
        assertEquals("100", page.getContent().get(99).getFlatNumber());
        assertEquals(2, stats.getPrepareStatementCount());
        assertEquals(0, stats.getEntityLoadCount());
    }

    @Test
    void filtersAndPaginationRetainCorrectCounts() {
        var page = service.getCollectionsPage(1L, 4L, "a", "partial", "owner", 1, 20);
        assertEquals(100, page.getTotalElements());
        assertEquals(5, page.getTotalPages());
        assertEquals("021", page.getContent().get(0).getFlatNumber());
        assertEquals(1, service.getCollectionsPage(1L, 4L, "A", "PARTIAL", "050", 0, 20).getTotalElements());
        assertEquals(0, service.getCollectionsPage(1L, 4L, "B", "", "", 0, 20).getTotalElements());
        assertEquals(0, service.getCollectionsPage(1L, 4L, "", "PAID", "", 0, 20).getTotalElements());
    }
}
