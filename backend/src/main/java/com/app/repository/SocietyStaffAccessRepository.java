package com.app.repository;

import com.app.entity.SocietyStaffAccess;
import com.app.entity.StaffAccessStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SocietyStaffAccessRepository extends JpaRepository<SocietyStaffAccess, Long> {
    Optional<SocietyStaffAccess> findByAccountIdAndStaffId(Long accountId, Long staffId);
    Optional<SocietyStaffAccess> findByAccountIdAndUserId(Long accountId, Long userId);
    Optional<SocietyStaffAccess> findByAccountIdAndUserIdAndStatus(
            Long accountId, Long userId, StaffAccessStatus status);
    List<SocietyStaffAccess> findByUserIdAndStatus(Long userId, StaffAccessStatus status);
}
