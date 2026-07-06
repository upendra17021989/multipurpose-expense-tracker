package com.app.service;

import com.app.dto.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;

@Service
public class PersonalDocumentService {
    private static final Set<String> EXTENSIONS = Set.of("jpg", "jpeg", "jfif", "png", "pdf");
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/jfif", "image/png");
    private static final Set<String> PDF_TYPES = Set.of("application/pdf");
    private final PersonalDocumentRepository repository;
    private final AccountRepository accountRepository;
    private final Path uploadRoot;
    private final long maxFileSize;

    public PersonalDocumentService(PersonalDocumentRepository repository, AccountRepository accountRepository,
            @Value("${app.file.upload.dir:./uploads}") String uploadDir,
            @Value("${app.file.max-size:5242880}") long maxFileSize) {
        this.repository = repository;
        this.accountRepository = accountRepository;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.maxFileSize = maxFileSize;
    }

    @Transactional(readOnly = true)
    public Page<PersonalDocumentDto> list(Long accountId, String query, PersonalDocumentCategory category,
            String status, int page, int size, String sort, Sort.Direction direction) {
        requireIndividualAccount(accountId);
        if (page < 0 || size < 1 || size > 100) throw new ValidationException("Invalid page or size");
        Set<String> allowedSorts = Set.of("createdAt", "title", "expiryDate");
        String sortField = allowedSorts.contains(sort) ? sort : "createdAt";
        Specification<PersonalDocument> spec = (root, ignored, cb) -> cb.equal(root.get("account").get("id"), accountId);
        if (StringUtils.hasText(query)) {
            String value = "%" + query.trim().toLowerCase() + "%";
            spec = spec.and((root, ignored, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), value),
                    cb.like(cb.lower(root.get("originalFileName")), value),
                    cb.like(cb.lower(root.get("issuer")), value),
                    cb.like(cb.lower(root.get("documentNumber")), value),
                    cb.like(cb.lower(root.get("tags")), value)));
        }
        if (category != null) spec = spec.and((root, ignored, cb) -> cb.equal(root.get("category"), category));
        spec = applyStatus(spec, status, LocalDate.now());
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
        return repository.findAll(spec, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public PersonalDocumentDto get(Long accountId, Long id) {
        requireIndividualAccount(accountId);
        return toDto(find(accountId, id));
    }

    @Transactional
    public PersonalDocumentDto create(Long accountId, Long userId, PersonalDocumentMetadataRequest request, MultipartFile file) {
        Account account = requireIndividualAccount(accountId);
        validateMetadata(request);
        validateFile(file);
        Path directory = uploadRoot.resolve("documents").resolve(String.valueOf(accountId)).normalize();
        ensureUnderRoot(directory);
        String original = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "document"));
        String stored = UUID.randomUUID() + "." + extension(original);
        Path target = directory.resolve(stored).normalize();
        ensureUnderRoot(target);
        try {
            Files.createDirectories(directory);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            PersonalDocument entity = PersonalDocument.builder().account(account).title(request.getTitle().trim())
                    .category(request.getCategory()).issuer(clean(request.getIssuer()))
                    .documentNumber(clean(request.getDocumentNumber())).issueDate(request.getIssueDate())
                    .expiryDate(request.getExpiryDate()).tags(clean(request.getTags())).notes(clean(request.getNotes()))
                    .originalFileName(original).storedFileName("documents/" + accountId + "/" + stored)
                    .contentType(Objects.requireNonNullElse(file.getContentType(), "application/octet-stream"))
                    .fileSize(file.getSize()).uploadedBy(userId).build();
            try { return toDto(repository.save(entity)); }
            catch (RuntimeException ex) { Files.deleteIfExists(target); throw ex; }
        } catch (IOException ex) {
            throw new ValidationException("Unable to store uploaded file", ex);
        }
    }

    @Transactional
    public PersonalDocumentDto update(Long accountId, Long id, PersonalDocumentMetadataRequest request) {
        requireIndividualAccount(accountId);
        validateMetadata(request);
        PersonalDocument entity = find(accountId, id);
        entity.setTitle(request.getTitle().trim()); entity.setCategory(request.getCategory());
        entity.setIssuer(clean(request.getIssuer())); entity.setDocumentNumber(clean(request.getDocumentNumber()));
        entity.setIssueDate(request.getIssueDate()); entity.setExpiryDate(request.getExpiryDate());
        entity.setTags(clean(request.getTags())); entity.setNotes(clean(request.getNotes()));
        return toDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public Resource load(Long accountId, Long id) {
        requireIndividualAccount(accountId);
        PersonalDocument entity = find(accountId, id);
        try {
            Path path = uploadRoot.resolve(entity.getStoredFileName()).normalize();
            ensureUnderRoot(path);
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) throw new ResourceNotFoundException("Document file not found");
            return resource;
        } catch (java.net.MalformedURLException ex) { throw new ResourceNotFoundException("Document file not found"); }
    }

    @Transactional
    public void delete(Long accountId, Long id) {
        requireIndividualAccount(accountId);
        PersonalDocument entity = find(accountId, id);
        repository.delete(entity);
        try {
            Path path = uploadRoot.resolve(entity.getStoredFileName()).normalize(); ensureUnderRoot(path); Files.deleteIfExists(path);
        } catch (IOException ignored) { }
    }

    @Transactional(readOnly = true)
    public PersonalDocumentSummaryDto summary(Long accountId) {
        requireIndividualAccount(accountId);
        LocalDate today = LocalDate.now();
        long total = repository.count(accountSpec(accountId));
        long expired = repository.count(accountSpec(accountId).and((r, q, cb) -> cb.lessThan(r.get("expiryDate"), today)));
        long soon = repository.count(accountSpec(accountId).and((r, q, cb) -> cb.between(r.get("expiryDate"), today, today.plusDays(30))));
        return PersonalDocumentSummaryDto.builder().total(total).expired(expired).expiringSoon(soon).build();
    }

    private Specification<PersonalDocument> accountSpec(Long id) { return (r, q, cb) -> cb.equal(r.get("account").get("id"), id); }
    private Specification<PersonalDocument> applyStatus(Specification<PersonalDocument> spec, String status, LocalDate today) {
        if (!StringUtils.hasText(status)) return spec;
        return switch (status.trim().toUpperCase()) {
            case "EXPIRED" -> spec.and((r, q, cb) -> cb.lessThan(r.get("expiryDate"), today));
            case "EXPIRING_SOON" -> spec.and((r, q, cb) -> cb.between(r.get("expiryDate"), today, today.plusDays(30)));
            case "ACTIVE" -> spec.and((r, q, cb) -> cb.greaterThan(r.get("expiryDate"), today.plusDays(30)));
            case "NO_EXPIRY" -> spec.and((r, q, cb) -> cb.isNull(r.get("expiryDate")));
            default -> throw new ValidationException("Invalid document status");
        };
    }
    private Account requireIndividualAccount(Long id) {
        Account account = accountRepository.findById(id).filter(a -> Boolean.TRUE.equals(a.getActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        if (account.getAccountType() != AccountType.INDIVIDUAL) throw new UnauthorizedException("My Documents is available only for Individual accounts");
        return account;
    }
    private PersonalDocument find(Long accountId, Long id) { return repository.findByIdAndAccountId(id, accountId).orElseThrow(() -> new ResourceNotFoundException("Document not found")); }
    private void validateMetadata(PersonalDocumentMetadataRequest r) {
        if (r == null || !StringUtils.hasText(r.getTitle()) || r.getCategory() == null) throw new ValidationException("Title and category are required");
        if (r.getIssueDate() != null && r.getExpiryDate() != null && r.getExpiryDate().isBefore(r.getIssueDate())) throw new ValidationException("Expiry date cannot be before issue date");
    }
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ValidationException("Upload file is required");
        if (file.getSize() > maxFileSize) throw new ValidationException("Upload file is too large");
        String ext = extension(file.getOriginalFilename());
        if (!EXTENSIONS.contains(ext)) throw new ValidationException("Only JPG, JPEG, JFIF, PNG, and PDF uploads are allowed");
        String contentType = Objects.requireNonNullElse(file.getContentType(), "").toLowerCase();
        boolean validPdf = ext.equals("pdf") && PDF_TYPES.contains(contentType);
        boolean validImage = !ext.equals("pdf") && IMAGE_TYPES.contains(contentType);
        if (!validPdf && !validImage) throw new ValidationException("File content type does not match its extension");
    }
    private String extension(String name) {
        String clean = StringUtils.cleanPath(Objects.requireNonNullElse(name, "")); int dot = clean.lastIndexOf('.');
        if (dot < 0 || dot == clean.length() - 1) throw new ValidationException("Upload file must have an extension");
        return clean.substring(dot + 1).toLowerCase();
    }
    private void ensureUnderRoot(Path path) { if (!path.startsWith(uploadRoot)) throw new ValidationException("Invalid upload path"); }
    private String clean(String value) { return StringUtils.hasText(value) ? value.trim() : null; }
    private PersonalDocumentDto toDto(PersonalDocument d) {
        return PersonalDocumentDto.builder().id(d.getId()).title(d.getTitle()).category(d.getCategory()).issuer(d.getIssuer())
                .documentNumber(d.getDocumentNumber()).issueDate(d.getIssueDate()).expiryDate(d.getExpiryDate())
                .tags(d.getTags()).notes(d.getNotes()).originalFileName(d.getOriginalFileName()).contentType(d.getContentType())
                .fileSize(d.getFileSize()).uploadedBy(d.getUploadedBy()).createdAt(d.getCreatedAt()).updatedAt(d.getUpdatedAt()).build();
    }
}
