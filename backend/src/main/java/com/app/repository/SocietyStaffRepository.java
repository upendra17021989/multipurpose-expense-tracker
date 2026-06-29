package com.app.repository;

import com.app.entity.SocietyStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SocietyStaffRepository extends JpaRepository<SocietyStaff, Long> {
    List<SocietyStaff> findByAccountIdAndActiveTrueOrderByStaffNameAsc(Long accountId);
    Optional<SocietyStaff> findByAccountIdAndIdAndActiveTrue(Long accountId, Long staffId);
}
