package com.app.controller;
import com.app.dto.SocietyAgencyDtos.*;
import com.app.security.UserPrincipal;
import com.app.service.SocietyAgencyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/society/agencies") @RequiredArgsConstructor
public class SocietyAgencyController {
 private final SocietyAgencyService service;
 @GetMapping public List<AgencyDto> list(@AuthenticationPrincipal UserPrincipal p){return service.list(p.getAccountId());}
 @PostMapping public ResponseEntity<AgencyDto> create(@AuthenticationPrincipal UserPrincipal p,@Valid @RequestBody AgencyRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.create(p.getAccountId(),r));}
 @PutMapping("/{id}") public AgencyDto update(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody AgencyRequest r){return service.update(p.getAccountId(),id,r);}
 @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id){service.delete(p.getAccountId(),id);return ResponseEntity.noContent().build();}
 @PostMapping("/{id}/workers") public ResponseEntity<WorkerDto> addWorker(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@Valid @RequestBody WorkerRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.addWorker(p.getAccountId(),id,r));}
 @PutMapping("/{id}/workers/{workerId}") public WorkerDto updateWorker(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@PathVariable Long workerId,@Valid @RequestBody WorkerRequest r){return service.updateWorker(p.getAccountId(),id,workerId,r);}
 @DeleteMapping("/{id}/workers/{workerId}") public ResponseEntity<Void> deleteWorker(@AuthenticationPrincipal UserPrincipal p,@PathVariable Long id,@PathVariable Long workerId){service.deleteWorker(p.getAccountId(),id,workerId);return ResponseEntity.noContent().build();}
}
