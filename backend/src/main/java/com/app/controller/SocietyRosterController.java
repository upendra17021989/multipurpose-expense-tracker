package com.app.controller;
import com.app.dto.SocietyRosterDtos.*; import com.app.security.UserPrincipal; import com.app.service.SocietyRosterService; import jakarta.validation.Valid; import lombok.RequiredArgsConstructor; import org.springframework.http.*; import org.springframework.security.core.annotation.AuthenticationPrincipal; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/society") @RequiredArgsConstructor public class SocietyRosterController { private final SocietyRosterService service;
 @GetMapping("/shifts") public List<ShiftDto> shifts(@AuthenticationPrincipal UserPrincipal p){return service.shifts(p.getAccountId());}
 @PostMapping("/shifts") public ResponseEntity<ShiftDto> createShift(@AuthenticationPrincipal UserPrincipal p,@Valid @RequestBody ShiftRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.createShift(p.getAccountId(),r));}
 @PutMapping("/shifts/{id}") public ShiftDto updateShift(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody ShiftRequest r){return service.updateShift(p.getAccountId(),id,r);}
 @DeleteMapping("/shifts/{id}") public ResponseEntity<Void> deleteShift(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){service.deleteShift(p.getAccountId(),id);return ResponseEntity.noContent().build();}
 @GetMapping("/roster-assignments") public List<AssignmentDto> roster(@AuthenticationPrincipal UserPrincipal p){return service.roster(p.getAccountId());}
 @PostMapping("/roster-assignments") public ResponseEntity<AssignmentDto> assign(@AuthenticationPrincipal UserPrincipal p,@Valid @RequestBody AssignmentRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.assign(p.getAccountId(),r));}
 @DeleteMapping("/roster-assignments/{id}") public ResponseEntity<Void> remove(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){service.removeAssignment(p.getAccountId(),id);return ResponseEntity.noContent().build();}
}
