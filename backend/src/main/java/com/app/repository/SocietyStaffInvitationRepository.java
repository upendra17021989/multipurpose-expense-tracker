package com.app.repository;

import com.app.entity.SocietyStaffInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface SocietyStaffInvitationRepository extends JpaRepository<SocietyStaffInvitation, Long> {
    Optional<SocietyStaffInvitation> findByTokenHash(String tokenHash);
    List<SocietyStaffInvitation> findByAccountIdAndStaffIdAndStatus(Long accountId, Long staffId, String status);
    Optional<SocietyStaffInvitation> findFirstByAccountIdAndStaffIdOrderByCreatedAtDesc(Long accountId, Long staffId);
}
