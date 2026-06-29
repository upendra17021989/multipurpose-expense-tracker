package com.app.service;

import com.app.dto.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service
public class SocietyStaffService {
    private final SocietyStaffRepository repository;
    private final AccountRepository accountRepository;
    public SocietyStaffService(SocietyStaffRepository repository, AccountRepository accountRepository) {
        this.repository = repository; this.accountRepository = accountRepository;
    }
    public List<SocietyStaffDto> getStaff(Long accountId) { validateSociety(accountId); return repository.findByAccountIdAndActiveTrueOrderByStaffNameAsc(accountId).stream().map(this::map).toList(); }
    public SocietyStaffDto getStaffMember(Long accountId, Long id) { return map(find(accountId, id)); }
    public SocietyStaffDto create(Long accountId, SocietyStaffRequest request) {
        Account account = validateSociety(accountId);
        return map(repository.save(SocietyStaff.builder().account(account).staffName(request.getStaffName().trim())
            .designation(request.getDesignation().trim()).mobile(trim(request.getMobile())).email(trim(request.getEmail()))
            .address(trim(request.getAddress())).joiningDate(request.getJoiningDate())
            .monthlySalary(request.getMonthlySalary() == null ? BigDecimal.ZERO : request.getMonthlySalary()).build()));
    }
    public SocietyStaffDto update(Long accountId, Long id, SocietyStaffRequest request) {
        SocietyStaff staff = find(accountId, id);
        staff.setStaffName(request.getStaffName().trim()); staff.setDesignation(request.getDesignation().trim());
        staff.setMobile(trim(request.getMobile())); staff.setEmail(trim(request.getEmail())); staff.setAddress(trim(request.getAddress()));
        staff.setJoiningDate(request.getJoiningDate()); staff.setMonthlySalary(request.getMonthlySalary() == null ? BigDecimal.ZERO : request.getMonthlySalary());
        return map(repository.save(staff));
    }
    public void delete(Long accountId, Long id) { SocietyStaff staff = find(accountId, id); staff.setActive(false); repository.save(staff); }
    private SocietyStaff find(Long accountId, Long id) { validateSociety(accountId); return repository.findByAccountIdAndIdAndActiveTrue(accountId, id).orElseThrow(() -> new ResourceNotFoundException("Staff member not found")); }
    private Account validateSociety(Long accountId) { Account a = accountRepository.findById(accountId).orElseThrow(() -> new ResourceNotFoundException("Account not found")); if (a.getAccountType() != AccountType.SOCIETY) throw new ValidationException("Staff are available only for society accounts"); return a; }
    private String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private SocietyStaffDto map(SocietyStaff s) { return SocietyStaffDto.builder().id(s.getId()).accountId(s.getAccount().getId()).staffName(s.getStaffName()).designation(s.getDesignation()).mobile(s.getMobile()).email(s.getEmail()).address(s.getAddress()).joiningDate(s.getJoiningDate()).monthlySalary(s.getMonthlySalary()).active(s.getActive()).createdAt(s.getCreatedAt()).build(); }
}
