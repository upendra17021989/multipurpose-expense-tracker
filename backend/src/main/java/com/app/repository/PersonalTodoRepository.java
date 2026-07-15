package com.app.repository;

import com.app.entity.PersonalTodo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PersonalTodoRepository extends JpaRepository<PersonalTodo, Long> {
    List<PersonalTodo> findByAccountIdOrderByCompletedAscDueDateAscCreatedAtDesc(Long accountId);
    Optional<PersonalTodo> findByIdAndAccountId(Long id, Long accountId);
}
