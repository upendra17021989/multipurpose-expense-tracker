package com.app.service;

import com.app.dto.FestivalEstimateRequest;
import com.app.entity.FestivalEvent;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.FestivalEventRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FestivalEstimateServiceTest {
    @Test void roundsLineAmountsToCurrencyPrecision() {
        assertEquals(new BigDecimal("30.02"), FestivalEstimateService.amount(new BigDecimal("1.5"), new BigDecimal("20.01")));
        assertEquals(new BigDecimal("0.00"), FestivalEstimateService.amount(new BigDecimal("2"), BigDecimal.ZERO));
    }
    @Test void rejectsOtherAccountsBeforeReadingOrWritingEstimates() {
        var festivals = mock(FestivalEventRepository.class);
        var jdbc = mock(JdbcTemplate.class);
        when(festivals.findByAccountIdAndIdAndDeletedAtIsNull(1L, 2L)).thenReturn(Optional.empty());
        var service = new FestivalEstimateService(festivals, jdbc);
        assertThrows(ResourceNotFoundException.class, () -> service.list(1L, 2L));
        assertThrows(ResourceNotFoundException.class, () -> service.save(1L, 2L, null, new FestivalEstimateRequest()));
        assertThrows(ResourceNotFoundException.class, () -> service.delete(1L, 2L, 3L));
        verifyNoInteractions(jdbc);
    }
    @Test void deleteIsScopedToSelectedFestival() {
        var festivals = mock(FestivalEventRepository.class);
        var jdbc = mock(JdbcTemplate.class);
        when(festivals.findByAccountIdAndIdAndDeletedAtIsNull(1L, 2L)).thenReturn(Optional.of(new FestivalEvent()));
        assertThrows(ResourceNotFoundException.class, () -> new FestivalEstimateService(festivals, jdbc).delete(1L, 2L, 99L));
        verify(jdbc).update("DELETE FROM festival_expense_estimates WHERE id=? AND festival_event_id=?", 99L, 2L);
    }
}
