package com.app.controller;
import com.app.dto.SharedExpenseDtos.*; import com.app.security.UserPrincipal; import com.app.service.SharedExpenseService; import jakarta.validation.Valid; import lombok.RequiredArgsConstructor; import org.springframework.http.*; import org.springframework.security.core.annotation.AuthenticationPrincipal; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/personal/shared-expenses") @RequiredArgsConstructor
public class SharedExpenseController { private final SharedExpenseService service;
 @GetMapping("/groups") public List<GroupDto> list(@AuthenticationPrincipal UserPrincipal p){return service.list(p.getAccountId(),p.getUserId());}
 @GetMapping("/friends") public List<FriendBalanceDto> friends(@AuthenticationPrincipal UserPrincipal p){return service.friends(p.getAccountId(),p.getUserId());}
 @PostMapping("/groups") public ResponseEntity<GroupDto> create(@AuthenticationPrincipal UserPrincipal p,@Valid @RequestBody GroupRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.createGroup(p.getAccountId(),p.getUserId(),r));}
 @GetMapping("/groups/{id}") public GroupDto get(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){return service.get(p.getAccountId(),p.getUserId(),id);}
 @PutMapping("/groups/{id}") public GroupDto update(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody GroupUpdateRequest r){return service.updateGroup(p.getAccountId(),p.getUserId(),id,r);}
 @PostMapping("/groups/{id}/members") public GroupDto member(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody MemberRequest r){return service.addMember(p.getAccountId(),p.getUserId(),id,r);}
 @PutMapping("/groups/{id}/members/{memberId}") public GroupDto updateMember(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@PathVariable Long memberId,@Valid @RequestBody MemberUpdateRequest r){return service.updateMember(p.getAccountId(),p.getUserId(),id,memberId,r);}
 @PostMapping("/groups/{id}/expenses") public GroupDto expense(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody ExpenseRequest r){return service.addExpense(p.getAccountId(),p.getUserId(),id,r);}
 @PostMapping("/groups/{id}/settlements") public GroupDto settle(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody SettlementRequest r){return service.settle(p.getAccountId(),p.getUserId(),id,r);}
 @DeleteMapping("/expenses/{id}") public GroupDto reverseExpense(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){return service.reverseExpense(p.getAccountId(),p.getUserId(),id);}
 @DeleteMapping("/settlements/{id}") public GroupDto reverseSettlement(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){return service.reverseSettlement(p.getAccountId(),p.getUserId(),id);}
 @DeleteMapping("/groups/{id}") public ResponseEntity<Void> deleteGroup(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){
   service.deleteGroup(p.getAccountId(),p.getUserId(),id);
   return ResponseEntity.noContent().build();
 }
}
