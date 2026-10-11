package com.app.service;

import com.app.repository.FestivalCouponRepository;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.sql.init.mode=never",
        "spring.config.import=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "logging.level.root=WARN",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
@ContextConfiguration(classes = FestivalCollectionSummaryTest.JpaConfiguration.class)
class FestivalCouponQueryTest {
    @Autowired FestivalCouponRepository coupons;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManagerFactory entityManagerFactory;

    @Test
    void hundredDistinctFlatsAndCouponDetailsUseOneQuery() {
        jdbc.execute("SET NON_KEYWORDS YEAR");
        jdbc.execute("CREATE TABLE flats (id BIGINT PRIMARY KEY, account_id BIGINT, block_name VARCHAR(100), flat_number VARCHAR(100), owner_name VARCHAR(100), mobile VARCHAR(100), email VARCHAR(100), resident_type VARCHAR(30), active BOOLEAN, created_at TIMESTAMP, updated_at TIMESTAMP)");
        jdbc.execute("CREATE TABLE festival_events (id BIGINT PRIMARY KEY, account_id BIGINT, festival_name VARCHAR(100), year INTEGER, start_date DATE, end_date DATE, budget_amount DECIMAL(10,2), collected_amount DECIMAL(10,2), total_expense DECIMAL(10,2), balance_amount DECIMAL(10,2), status VARCHAR(30), created_at TIMESTAMP, updated_at TIMESTAMP, deleted_at TIMESTAMP)");
        jdbc.execute("CREATE TABLE festival_coupons (id BIGINT PRIMARY KEY, account_id BIGINT, festival_event_id BIGINT, festival_collection_id BIGINT, flat_id BIGINT, coupon_number VARCHAR(100), sequence_number INTEGER, status VARCHAR(30), generated_by BIGINT, generated_at TIMESTAMP, used_at TIMESTAMP, cancelled_at TIMESTAMP)");
        jdbc.execute("INSERT INTO festival_events (id, account_id, festival_name, year, status) VALUES (4, 1, 'Festival', 2026, 'ACTIVE'), (5, 1, 'Other event', 2026, 'ACTIVE')");
        for (int i = 1; i <= 102; i++) {
            jdbc.update("INSERT INTO flats (id, account_id, block_name, flat_number, owner_name) VALUES (?, 1, 'A', ?, 'Owner')", i, String.format("%03d", i));
            jdbc.update("INSERT INTO festival_coupons (id, account_id, festival_event_id, festival_collection_id, flat_id, coupon_number, sequence_number, status) VALUES (?, ?, ?, ?, ?, ?, 1, 'ACTIVE')",
                    i, i == 101 ? 2 : 1, i == 102 ? 5 : 4, i, i, "FC-" + i);
        }
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        var result = coupons.findByAccountIdAndFestivalEventIdOrderByFlatBlockNameAscFlatFlatNumberAscSequenceNumberAsc(1L, 4L);

        assertEquals(100, result.size());
        for (int i = 0; i < result.size(); i++) {
            var coupon = result.get(i);
            assertEquals("A", coupon.getFlat().getBlockName());
            assertEquals(String.format("%03d", i + 1), coupon.getFlat().getFlatNumber());
            assertEquals("Owner", coupon.getFlat().getOwnerName());
            assertEquals("Festival", coupon.getFestivalEvent().getFestivalName());
            assertEquals((long) i + 1, coupon.getFestivalCollection().getId());
        }
        assertEquals(1, statistics.getPrepareStatementCount(), "Coupon mapping must not fetch each flat separately");
    }
}
