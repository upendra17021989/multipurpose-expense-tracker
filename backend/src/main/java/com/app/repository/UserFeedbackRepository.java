package com.app.repository;

import com.app.entity.UserFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {
    List<UserFeedback> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<UserFeedback> findByAccountIdOrderByCreatedAtDesc(Long accountId);
    Page<UserFeedback> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<UserFeedback> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}

