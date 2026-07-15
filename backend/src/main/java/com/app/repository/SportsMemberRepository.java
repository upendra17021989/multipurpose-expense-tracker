package com.app.repository;

import com.app.entity.SportsMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SportsMemberRepository extends JpaRepository<SportsMember, Long> {
    List<SportsMember> findByAccountIdAndActiveTrue(Long accountId);
    Optional<SportsMember> findByAccountIdAndIdAndActiveTrue(Long accountId, Long id);
}
