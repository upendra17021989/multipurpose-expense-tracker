package com.app.controller;

import com.app.dto.SocietyOptionDto;
import com.app.entity.AccountType;
import com.app.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/public/sports-workspaces")
@RequiredArgsConstructor
public class PublicSportsWorkspaceController {
    private final AccountRepository accountRepository;

    @GetMapping
    public List<SocietyOptionDto> list() {
        return accountRepository.findByAccountTypeAndActiveTrueOrderByAccountNameAsc(AccountType.SPORTS).stream()
                .map(account -> new SocietyOptionDto(account.getId(), account.getAccountName(), account.getAddress()))
                .toList();
    }
}
