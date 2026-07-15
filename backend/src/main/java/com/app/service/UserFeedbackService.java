package com.app.service;

import com.app.dto.UserFeedbackDto;
import com.app.dto.UserFeedbackRequest;
import com.app.dto.UserFeedbackStatusRequest;
import com.app.entity.Account;
import com.app.entity.User;
import com.app.entity.UserFeedback;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.AccountRepository;
import com.app.repository.UserFeedbackRepository;
import com.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
@Transactional
@RequiredArgsConstructor
public class UserFeedbackService {
    private final UserFeedbackRepository repository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserFeedbackDto> listForUser(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public Page<UserFeedbackDto> listForAdmin(String status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<UserFeedback> rows = status == null || status.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc(pageable)
                : repository.findByStatusOrderByCreatedAtDesc(status.trim(), pageable);
        return rows.map(this::map);
    }
    public UserFeedbackDto create(Long accountId, Long userId, UserFeedbackRequest request) {
        Account account = accountRepository.findById(accountId).orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserFeedback feedback = UserFeedback.builder()
                .account(account)
                .user(user)
                .feedbackType(cleanType(request.getFeedbackType()))
                .title(clean(request.getTitle()))
                .message(request.getMessage().trim())
                .pageUrl(clean(request.getPageUrl()))
                .rating(request.getRating())
                .build();
        return map(repository.save(feedback));
    }


    public UserFeedbackDto updateStatus(Long id, UserFeedbackStatusRequest request) {
        UserFeedback feedback = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));
        feedback.setStatus(request.getStatus().trim());
        feedback.setAdminRemarks(clean(request.getAdminRemarks()));
        return map(repository.save(feedback));
    }
    private String cleanType(String value) { return value == null || value.isBlank() ? "SUGGESTION" : value.trim(); }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private UserFeedbackDto map(UserFeedback feedback) {
        Account account = feedback.getAccount();
        return UserFeedbackDto.builder()
                .id(feedback.getId())
                .feedbackType(feedback.getFeedbackType())
                .title(feedback.getTitle())
                .message(feedback.getMessage())
                .pageUrl(feedback.getPageUrl())
                .rating(feedback.getRating())
                .status(feedback.getStatus())
                .adminRemarks(feedback.getAdminRemarks())
                .accountName(account.getAccountName())
                .userName(feedback.getUser().getName())
                .userMobile(feedback.getUser().getMobile())
                .userEmail(feedback.getUser().getEmail())
                .accountType(account.getAccountType().name())
                .createdAt(feedback.getCreatedAt())
                .build();
    }
}




