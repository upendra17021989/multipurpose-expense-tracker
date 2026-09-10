package com.app.controller;
import com.app.service.SocietyWorkOrderExpenseService;
import com.app.dto.SocietyWorkOrderDtos.*; import com.app.security.UserPrincipal; import com.app.service.SocietyWorkOrderService; import jakarta.validation.Valid; import lombok.RequiredArgsConstructor; import org.springframework.security.core.annotation.AuthenticationPrincipal; import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/society/work-orders") @RequiredArgsConstructor public class SocietyWorkOrderController {private final SocietyWorkOrderService service;private final SocietyWorkOrderExpenseService expenseService;
 @GetMapping public List<WorkOrderDto> list(@AuthenticationPrincipal UserPrincipal p){return service.list(p.getAccountId());}
 @GetMapping("/{id}") public WorkOrderDto get(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){return service.get(p.getAccountId(),id);}
 @PostMapping public WorkOrderDto create(@AuthenticationPrincipal UserPrincipal p,@Valid @RequestBody CreateRequest r){return service.create(p.getAccountId(),p.getUserId(),r);}
 @PostMapping("/{id}/assignments") public WorkOrderDto assign(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody AssignmentRequest r){return service.assign(p.getAccountId(),p.getUserId(),id,r);}
 @PostMapping("/{id}/updates") public WorkOrderDto update(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody UpdateRequest r){return service.update(p.getAccountId(),p.getUserId(),id,r);}
 @PostMapping("/{id}/complete") public WorkOrderDto complete(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody CompleteRequest r){return service.complete(p.getAccountId(),p.getUserId(),id,r);}
 @PostMapping("/{id}/verify") public WorkOrderDto verify(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody VerifyRequest r){return service.verify(p.getAccountId(),p.getUserId(),id,r);}
 @PostMapping("/{id}/reopen") public WorkOrderDto reopen(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody VerifyRequest r){return service.reopen(p.getAccountId(),p.getUserId(),id,r);}
 @PostMapping("/{id}/expense-requests") public WorkOrderDto requestExpense(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody ExpenseRequest r){return expenseService.request(p.getAccountId(),p.getUserId(),id,r);}
 @GetMapping("/{id}/expense-requests") public List<ExpenseSummary> expenses(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){return expenseService.list(p.getAccountId(),id);}
}
