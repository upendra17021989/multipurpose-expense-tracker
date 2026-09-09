package com.app.service;

import com.app.dto.FestivalEstimateRequest;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.FestivalEventRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FestivalEstimateService {
    private final FestivalEventRepository festivals;
    private final JdbcTemplate jdbc;
    public record Estimate(Long id, String description, String categoryName, String vendorName,
            BigDecimal quantity, BigDecimal unitCost, BigDecimal amount, String remarks) {}

    private void checkAccess(Long accountId, Long festivalId) {
        festivals.findByAccountIdAndIdAndDeletedAtIsNull(accountId, festivalId)
                .orElseThrow(() -> new ResourceNotFoundException("Festival event not found"));
    }

    @Transactional(readOnly = true)
    public List<Estimate> list(Long accountId, Long festivalId) {
        checkAccess(accountId, festivalId);
        return jdbc.query("SELECT * FROM festival_expense_estimates WHERE festival_event_id = ? ORDER BY id", (row, index) -> {
            BigDecimal quantity = row.getBigDecimal("quantity");
            BigDecimal cost = row.getBigDecimal("unit_cost");
            return new Estimate(row.getLong("id"), row.getString("description"), row.getString("category_name"),
                    row.getString("vendor_name"), quantity, cost, amount(quantity, cost), row.getString("remarks"));
        }, festivalId);
    }

    public void save(Long accountId, Long festivalId, Long id, FestivalEstimateRequest request) {
        checkAccess(accountId, festivalId);
        if (id == null) {
            jdbc.update("INSERT INTO festival_expense_estimates (festival_event_id, description, category_name, vendor_name, quantity, unit_cost, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    festivalId, request.getDescription().trim(), request.getCategoryName().trim(), request.getVendorName(), request.getQuantity(), request.getUnitCost(), request.getRemarks());
        } else {
            int changed = jdbc.update("UPDATE festival_expense_estimates SET description=?, category_name=?, vendor_name=?, quantity=?, unit_cost=?, remarks=? WHERE id=? AND festival_event_id=?",
                    request.getDescription().trim(), request.getCategoryName().trim(), request.getVendorName(), request.getQuantity(), request.getUnitCost(), request.getRemarks(), id, festivalId);
            if (changed == 0) throw new ResourceNotFoundException("Estimate not found");
        }
    }

    public void delete(Long accountId, Long festivalId, Long id) {
        checkAccess(accountId, festivalId);
        if (jdbc.update("DELETE FROM festival_expense_estimates WHERE id=? AND festival_event_id=?", id, festivalId) == 0)
            throw new ResourceNotFoundException("Estimate not found");
    }

    static BigDecimal amount(BigDecimal quantity, BigDecimal cost) {
        return quantity.multiply(cost).setScale(2, RoundingMode.HALF_UP);
    }
}
