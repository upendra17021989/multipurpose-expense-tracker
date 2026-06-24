package com.app.controller;

import com.app.dto.CustomerCreateRequest;
import com.app.dto.CustomerDto;
import com.app.security.UserPrincipal;
import com.app.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/kirana/customers")
public class KiranaCustomerController {
    private final CustomerService customerService;

    public KiranaCustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public ResponseEntity<List<CustomerDto>> getCustomers(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(customerService.getCustomers(userPrincipal.getAccountId()));
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<CustomerDto> getCustomer(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long customerId) {
        return ResponseEntity.ok(customerService.getCustomer(userPrincipal.getAccountId(), customerId));
    }

    @PostMapping
    public ResponseEntity<CustomerDto> createCustomer(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody CustomerCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerService.createCustomer(userPrincipal.getAccountId(), request));
    }

    @PutMapping("/{customerId}")
    public ResponseEntity<CustomerDto> updateCustomer(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long customerId,
            @Valid @RequestBody CustomerCreateRequest request) {
        return ResponseEntity.ok(customerService.updateCustomer(userPrincipal.getAccountId(), customerId, request));
    }

    @DeleteMapping("/{customerId}")
    public ResponseEntity<Void> deleteCustomer(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long customerId) {
        customerService.deleteCustomer(userPrincipal.getAccountId(), customerId);
        return ResponseEntity.noContent().build();
    }
}
