package com.app.repository;

import com.app.entity.FlatMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlatMemberRepository extends JpaRepository<FlatMember, Long> {
    List<FlatMember> findByFlatIdAndActiveTrue(Long flatId);
}
