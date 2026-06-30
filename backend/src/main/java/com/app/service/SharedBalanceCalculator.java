package com.app.service;
import com.app.exception.ValidationException; import java.math.BigDecimal; import java.util.*;
public final class SharedBalanceCalculator { private SharedBalanceCalculator() {}
 public static Map<Long,BigDecimal> calculate(Collection<Long> memberIds,Map<Long,BigDecimal> paid,Map<Long,BigDecimal> owed,List<Settlement> settlements){Map<Long,BigDecimal> result=new LinkedHashMap<>();memberIds.forEach(id->result.put(id,BigDecimal.ZERO));paid.forEach((id,value)->adjust(result,id,value));owed.forEach((id,value)->adjust(result,id,value.negate()));settlements.forEach(x->{adjust(result,x.paidBy(),x.amount());adjust(result,x.paidTo(),x.amount().negate());});if(result.values().stream().reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(BigDecimal.ZERO)!=0)throw new ValidationException("Shared balances do not sum to zero");return result;}
 private static void adjust(Map<Long,BigDecimal> balances,Long id,BigDecimal value){if(!balances.containsKey(id))throw new ValidationException("Balance references an unknown member");balances.compute(id,(key,current)->current.add(value));}
 public record Settlement(Long paidBy,Long paidTo,BigDecimal amount){}
}
