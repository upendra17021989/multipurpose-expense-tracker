package com.app.service;
import com.app.exception.ValidationException; import java.math.*; import java.util.*;
public final class SharedSplitCalculator {
  private SharedSplitCalculator() {}
  public static Map<Long,BigDecimal> equal(BigDecimal total,List<Long> ids) {
    return weighted(total, ids, null);
  }
  public static Map<Long,BigDecimal> weighted(BigDecimal total,List<Long> ids,Map<Long,Integer> counts) {
    if(ids==null||ids.isEmpty()) throw new ValidationException("Select at least one participant");
    if(new HashSet<>(ids).size()!=ids.size()) throw new ValidationException("Duplicate participant");
    if(counts!=null&&!new HashSet<>(ids).containsAll(counts.keySet()))
      throw new ValidationException("Share counts must match selected participants");
    BigDecimal units=BigDecimal.ZERO;
    for(Long id:ids) {
      Integer count=counts==null?Integer.valueOf(1):counts.getOrDefault(id,1);
      if(count==null||count<1) throw new ValidationException("Share counts must be positive whole numbers");
      units=units.add(BigDecimal.valueOf(count));
    }
    BigDecimal value=total.setScale(2,RoundingMode.UNNECESSARY), remainder=value;
    Map<Long,BigDecimal> result=new LinkedHashMap<>();
    for(Long id:ids) {
      int count=counts==null?1:counts.getOrDefault(id,1);
      BigDecimal amount=value.multiply(BigDecimal.valueOf(count)).divide(units,2,RoundingMode.DOWN);
      result.put(id,amount);
      remainder=remainder.subtract(amount);
    }
    for(Long id:ids) {
      if(remainder.signum()<=0) break;
      result.put(id,result.get(id).add(new BigDecimal("0.01")));
      remainder=remainder.subtract(new BigDecimal("0.01"));
    }
    return result;
  }
  public static void requireTotal(BigDecimal total,Collection<BigDecimal> values) {
    if(values.stream().reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(total)!=0)
      throw new ValidationException("Share total must equal expense total");
  }
}
