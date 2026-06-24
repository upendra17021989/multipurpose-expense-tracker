package com.app.service;

import com.app.dto.CustomerCreateRequest;
import com.app.dto.CustomerDto;
import com.app.entity.Account;
import com.app.entity.Customer;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class CustomerService {
    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public List<CustomerDto> getCustomers(Long accountId) {
        return customerRepository.findByAccountIdAndActiveTrue(accountId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerDto getCustomer(Long accountId, Long customerId) {
        return mapToDto(findCustomer(accountId, customerId));
    }

    @Transactional
    public CustomerDto createCustomer(Long accountId, CustomerCreateRequest request) {
        Account account = new Account();
        account.setId(accountId);
        BigDecimal openingCredit = nonNull(request.getOpeningCredit());

        Customer customer = Customer.builder()
                .account(account)
                .customerName(request.getCustomerName().trim())
                .mobile(request.getMobile().trim())
                .email(trimToNull(request.getEmail()))
                .address(trimToNull(request.getAddress()))
                .openingCredit(openingCredit)
                .currentCredit(openingCredit)
                .active(true)
                .build();

        return mapToDto(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto updateCustomer(Long accountId, Long customerId, CustomerCreateRequest request) {
        Customer customer = findCustomer(accountId, customerId);
        BigDecimal oldOpening = nonNull(customer.getOpeningCredit());
        BigDecimal newOpening = nonNull(request.getOpeningCredit());

        customer.setCustomerName(request.getCustomerName().trim());
        customer.setMobile(request.getMobile().trim());
        customer.setEmail(trimToNull(request.getEmail()));
        customer.setAddress(trimToNull(request.getAddress()));
        customer.setOpeningCredit(newOpening);
        customer.setCurrentCredit(nonNull(customer.getCurrentCredit()).subtract(oldOpening).add(newOpening));

        return mapToDto(customerRepository.save(customer));
    }

    @Transactional
    public void deleteCustomer(Long accountId, Long customerId) {
        Customer customer = findCustomer(accountId, customerId);
        customer.setActive(false);
        customerRepository.save(customer);
    }

    private Customer findCustomer(Long accountId, Long customerId) {
        return customerRepository.findByAccountIdAndIdAndActiveTrue(accountId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }

    private CustomerDto mapToDto(Customer customer) {
        return CustomerDto.builder()
                .id(customer.getId())
                .accountId(customer.getAccount().getId())
                .customerName(customer.getCustomerName())
                .mobile(customer.getMobile())
                .email(customer.getEmail())
                .address(customer.getAddress())
                .openingCredit(customer.getOpeningCredit())
                .currentCredit(customer.getCurrentCredit())
                .active(customer.getActive())
                .createdAt(customer.getCreatedAt())
                .build();
    }

    private BigDecimal nonNull(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
