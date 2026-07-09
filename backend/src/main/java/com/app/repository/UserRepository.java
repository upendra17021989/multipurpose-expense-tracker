package com.app.repository;

import com.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByMobile(String mobile);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByMobileAndIdNot(String mobile, Long id);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
    Optional<User> findByMobileAndActive(String mobile, Boolean active);
}
