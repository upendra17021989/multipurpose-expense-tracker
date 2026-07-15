package com.app.service;

import com.app.dto.PersonalTodoDto;
import com.app.dto.PersonalTodoRequest;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.PersonalTodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class PersonalTodoService {
    private final PersonalTodoRepository repository;
    private final AccountRepository accountRepository;

    @Transactional(readOnly = true)
    public List<PersonalTodoDto> list(Long accountId) {
        requirePersonalAccount(accountId);
        return repository.findByAccountIdOrderByCompletedAscDueDateAscCreatedAtDesc(accountId).stream().map(this::map).toList();
    }

    public PersonalTodoDto create(Long accountId, PersonalTodoRequest request) {
        Account account = requirePersonalAccount(accountId);
        return map(repository.save(PersonalTodo.builder().account(account).title(request.getTitle().trim())
                .notes(clean(request.getNotes())).dueDate(request.getDueDate()).priority(priority(request.getPriority())).build()));
    }

    public PersonalTodoDto update(Long accountId, Long id, PersonalTodoRequest request) {
        PersonalTodo todo = find(accountId, id);
        todo.setTitle(request.getTitle().trim());
        todo.setNotes(clean(request.getNotes()));
        todo.setDueDate(request.getDueDate());
        todo.setPriority(priority(request.getPriority()));
        return map(repository.save(todo));
    }

    public PersonalTodoDto setCompleted(Long accountId, Long id, boolean completed) {
        PersonalTodo todo = find(accountId, id);
        todo.setCompleted(completed);
        todo.setCompletedAt(completed ? LocalDateTime.now() : null);
        return map(repository.save(todo));
    }

    public void delete(Long accountId, Long id) { repository.delete(find(accountId, id)); }

    private PersonalTodo find(Long accountId, Long id) {
        requirePersonalAccount(accountId);
        return repository.findByIdAndAccountId(id, accountId).orElseThrow(() -> new ResourceNotFoundException("To-do item not found"));
    }

    private Account requirePersonalAccount(Long id) {
        return accountRepository.findById(id).filter(a -> a.getAccountType() == AccountType.INDIVIDUAL && Boolean.TRUE.equals(a.getActive()))
                .orElseThrow(() -> new ValidationException("To-do list is available only for active Individual accounts"));
    }

    private String priority(String value) { return value == null || value.isBlank() ? "MEDIUM" : value; }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private PersonalTodoDto map(PersonalTodo todo) {
        return PersonalTodoDto.builder().id(todo.getId()).title(todo.getTitle()).notes(todo.getNotes()).dueDate(todo.getDueDate())
                .priority(todo.getPriority()).completed(todo.getCompleted()).completedAt(todo.getCompletedAt()).createdAt(todo.getCreatedAt()).build();
    }
}
