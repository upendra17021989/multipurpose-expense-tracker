package com.app.service;

import com.app.exception.ValidationException;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SharedWeightedSplitTest {
  @Test void defaultsMissingCountsToOne() {
    var ids = List.of(1L, 2L, 3L);
    assertEquals(SharedSplitCalculator.equal(new BigDecimal("100.00"), ids),
        SharedSplitCalculator.weighted(new BigDecimal("100.00"), ids, Map.of()));
  }
  @Test void doublesThePortionAndPreservesTotal() {
    var result = SharedSplitCalculator.weighted(new BigDecimal("120.00"), List.of(1L, 2L, 3L), Map.of(2L, 2));
    assertEquals(new BigDecimal("30.00"), result.get(1L));
    assertEquals(new BigDecimal("60.00"), result.get(2L));
    assertEquals(new BigDecimal("30.00"), result.get(3L));
    SharedSplitCalculator.requireTotal(new BigDecimal("120.00"), result.values());
  }
  @Test void roundsWeightedSharesInParticipantOrder() {
    var result = SharedSplitCalculator.weighted(new BigDecimal("0.05"), List.of(1L, 2L, 3L), Map.of(2L, 2));
    assertEquals(Map.of(1L, new BigDecimal("0.02"), 2L, new BigDecimal("0.02"), 3L, new BigDecimal("0.01")), result);
  }
  @Test void rejectsInvalidCountsAndUnselectedMembers() {
    for (int count : new int[] {0, -1})
      assertThrows(ValidationException.class, () -> SharedSplitCalculator.weighted(new BigDecimal("10.00"), List.of(1L), Map.of(1L, count)));
    assertThrows(ValidationException.class, () -> SharedSplitCalculator.weighted(new BigDecimal("10.00"), List.of(1L), Map.of(2L, 2)));
    Map<Long, Integer> nullCount = new HashMap<>();
    nullCount.put(1L, null);
    assertThrows(ValidationException.class, () -> SharedSplitCalculator.weighted(new BigDecimal("10.00"), List.of(1L), nullCount));
  }
}
