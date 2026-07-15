package com.app.controller;

import com.app.dto.SportsDtos.*;
import com.app.security.UserPrincipal;
import com.app.service.SportsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.app.dto.SportsMembershipRequestDto;

@RestController
@RequestMapping("/sports")
public class SportsController {
    private final SportsService sportsService;

    public SportsController(SportsService sportsService) {
        this.sportsService = sportsService;
    }

    @GetMapping("/members")
    public ResponseEntity<List<MemberDto>> getMembers(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(sportsService.getMembers(userPrincipal.getAccountId()));
    }

    @GetMapping("/membership-requests")
    public List<SportsMembershipRequestDto> membershipRequests(@AuthenticationPrincipal UserPrincipal principal) {
        return sportsService.pendingMemberships(principal.getAccountId(), principal.getUserId());
    }

    @PostMapping("/membership-requests/{id}/approve")
    public SportsMembershipRequestDto approveMembership(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return sportsService.approveMembership(principal.getAccountId(), principal.getUserId(), id);
    }

    @DeleteMapping("/membership-requests/{id}")
    public ResponseEntity<Void> rejectMembership(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        sportsService.rejectMembership(principal.getAccountId(), principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }


    @PostMapping("/members/generate-logins")
    public ResponseEntity<List<MemberLoginDto>> generateMemberLogins(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.ok(sportsService.generateMissingMemberLogins(userPrincipal.getAccountId()));
    }
    @GetMapping("/members/{memberId}")
    public ResponseEntity<MemberDto> getMember(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long memberId) {
        return ResponseEntity.ok(sportsService.getMember(userPrincipal.getAccountId(), memberId));
    }

    @PostMapping("/members")
    public ResponseEntity<MemberDto> createMember(@AuthenticationPrincipal UserPrincipal userPrincipal, @Valid @RequestBody MemberRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(sportsService.createMember(userPrincipal.getAccountId(), request));
    }

    @PutMapping("/members/{memberId}")
    public ResponseEntity<MemberDto> updateMember(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long memberId, @Valid @RequestBody MemberRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.ok(sportsService.updateMember(userPrincipal.getAccountId(), memberId, request));
    }

    @DeleteMapping("/members/{memberId}")
    public ResponseEntity<Void> deleteMember(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long memberId) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        sportsService.deleteMember(userPrincipal.getAccountId(), memberId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/events")
    public ResponseEntity<List<EventDto>> getEvents(@AuthenticationPrincipal UserPrincipal userPrincipal, @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(sportsService.getEvents(userPrincipal.getAccountId(), year));
    }

    @GetMapping("/events/{eventId}")
    public ResponseEntity<EventDto> getEvent(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long eventId) {
        return ResponseEntity.ok(sportsService.getEvent(userPrincipal.getAccountId(), eventId));
    }

    @PostMapping("/events")
    public ResponseEntity<EventDto> createEvent(@AuthenticationPrincipal UserPrincipal userPrincipal, @Valid @RequestBody EventRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(sportsService.createEvent(userPrincipal.getAccountId(), userPrincipal.getUserId(), request));
    }

    @PutMapping("/events/{eventId}")
    public ResponseEntity<EventDto> updateEvent(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long eventId, @Valid @RequestBody EventRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.ok(sportsService.updateEvent(userPrincipal.getAccountId(), eventId, request));
    }

    @PutMapping("/events/{eventId}/status")
    public ResponseEntity<EventDto> updateEventStatus(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long eventId, @Valid @RequestBody StatusRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.ok(sportsService.updateEventStatus(userPrincipal.getAccountId(), eventId, request));
    }

    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<Void> deleteEvent(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long eventId) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        sportsService.deleteEvent(userPrincipal.getAccountId(), eventId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/expenses")
    public ResponseEntity<List<ExpenseDto>> getExpenses(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(sportsService.getExpenses(userPrincipal.getAccountId()));
    }

    @GetMapping("/expenses/{expenseId}")
    public ResponseEntity<ExpenseDto> getExpense(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long expenseId) {
        return ResponseEntity.ok(sportsService.getExpense(userPrincipal.getAccountId(), expenseId));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ExpenseDto> createExpense(@AuthenticationPrincipal UserPrincipal userPrincipal, @Valid @RequestBody ExpenseRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(sportsService.createExpense(userPrincipal.getAccountId(), request));
    }

    @PutMapping("/expenses/{expenseId}")
    public ResponseEntity<ExpenseDto> updateExpense(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long expenseId, @Valid @RequestBody ExpenseRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.ok(sportsService.updateExpense(userPrincipal.getAccountId(), expenseId, request));
    }

    @DeleteMapping("/expenses/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long expenseId) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        sportsService.deleteExpense(userPrincipal.getAccountId(), expenseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/collections")
    public ResponseEntity<List<CollectionDto>> getCollections(@AuthenticationPrincipal UserPrincipal userPrincipal, @RequestParam Long sportsEventId) {
        return ResponseEntity.ok(sportsService.getCollections(userPrincipal.getAccountId(), sportsEventId));
    }

    @GetMapping("/collections/summary")
    public ResponseEntity<CollectionSummaryDto> getCollectionSummary(@AuthenticationPrincipal UserPrincipal userPrincipal, @RequestParam Long sportsEventId) {
        return ResponseEntity.ok(sportsService.getCollectionSummary(userPrincipal.getAccountId(), sportsEventId));
    }

    @PostMapping("/collections/generate-demand")
    public ResponseEntity<List<CollectionDto>> generateDemand(@AuthenticationPrincipal UserPrincipal userPrincipal, @Valid @RequestBody DemandRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(sportsService.generateDemand(userPrincipal.getAccountId(), request));
    }

    @PutMapping("/collections/{collectionId}/demand")
    public ResponseEntity<CollectionDto> updateDemand(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long collectionId, @Valid @RequestBody DemandRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.ok(sportsService.updateDemand(userPrincipal.getAccountId(), collectionId, request));
    }

    @DeleteMapping("/collections/{collectionId}/demand")
    public ResponseEntity<Void> deleteDemand(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long collectionId) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        sportsService.deleteDemand(userPrincipal.getAccountId(), collectionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/collections/{collectionId}/payments")
    public ResponseEntity<ReceiptDto> addPayment(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long collectionId, @Valid @RequestBody PaymentRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(sportsService.addPayment(userPrincipal.getAccountId(), collectionId, request));
    }


    @PostMapping("/receipts/{receiptId}/void")
    public ResponseEntity<ReceiptDto> voidReceipt(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long receiptId, @Valid @RequestBody VoidReceiptRequest request) {
        sportsService.requireSportsAdmin(userPrincipal.getAccountId(), userPrincipal.getUserId());
        return ResponseEntity.ok(sportsService.voidReceipt(userPrincipal.getAccountId(), receiptId, request));
    }
    @GetMapping("/collections/{collectionId}/receipts")
    public ResponseEntity<List<ReceiptDto>> getReceipts(@AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable Long collectionId) {
        return ResponseEntity.ok(sportsService.getReceipts(userPrincipal.getAccountId(), collectionId));
    }
}



