package com.app.service;
import org.junit.jupiter.api.Test; import java.math.BigDecimal; import java.util.*; import static org.junit.jupiter.api.Assertions.*;
class SharedBalanceCalculatorTest {
 @Test void multiplePayersRemainBalanced(){var balances=SharedBalanceCalculator.calculate(List.of(1L,2L,3L),Map.of(1L,new BigDecimal("70.00"),2L,new BigDecimal("30.00")),Map.of(1L,new BigDecimal("33.34"),2L,new BigDecimal("33.33"),3L,new BigDecimal("33.33")),List.of());assertEquals(new BigDecimal("36.66"),balances.get(1L));assertEquals(new BigDecimal("-3.33"),balances.get(2L));assertEquals(new BigDecimal("-33.33"),balances.get(3L));assertEquals(0,balances.values().stream().reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(BigDecimal.ZERO));}
 @Test void partialSettlementMovesBothBalances(){var balances=SharedBalanceCalculator.calculate(List.of(1L,2L),Map.of(1L,new BigDecimal("100.00")),Map.of(1L,new BigDecimal("50.00"),2L,new BigDecimal("50.00")),List.of(new SharedBalanceCalculator.Settlement(2L,1L,new BigDecimal("20.00"))));assertEquals(new BigDecimal("30.00"),balances.get(1L));assertEquals(new BigDecimal("-30.00"),balances.get(2L));}
}
