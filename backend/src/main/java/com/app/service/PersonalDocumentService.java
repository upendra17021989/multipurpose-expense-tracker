package com.app.service;

import com.app.dto.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.net.URI;
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
    private final PersonalDocumentShareRepository shareRepository;
    private final UserRepository userRepository;
    private final Path uploadRoot;
    private final long maxFileSize;
    private final S3Client s3Client;
    private final String s3Bucket;
    private final boolean s3Enabled;

    @Autowired
    public PersonalDocumentService(PersonalDocumentRepository repository, AccountRepository accountRepository,
            PersonalDocumentShareRepository shareRepository, UserRepository userRepository,
            @Value("${app.file.upload.dir:./uploads}") String uploadDir,
            @Value("${app.file.max-size:5242880}") long maxFileSize,
            @Value("${app.storage.provider:local}") String storageProvider,
            @Value("${app.supabase.s3.endpoint:}") String s3Endpoint,
            @Value("${app.supabase.s3.access-key:}") String s3AccessKey,
            @Value("${app.supabase.s3.secret-key:}") String s3SecretKey,
            @Value("${app.supabase.s3.region:ap-south-1}") String s3Region,
            @Value("${app.supabase.storage.bucket:}") String s3Bucket) {
        this.repository = repository;
        this.accountRepository = accountRepository;
        this.shareRepository = shareRepository;
        this.userRepository = userRepository;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.maxFileSize = maxFileSize;
        this.s3Bucket = clean(s3Bucket);
        this.s3Enabled = "supabase-s3".equalsIgnoreCase(clean(storageProvider))
                && StringUtils.hasText(s3Endpoint)
                && StringUtils.hasText(s3AccessKey)
                && StringUtils.hasText(s3SecretKey)
                && StringUtils.hasText(this.s3Bucket);
        this.s3Client = s3Enabled ? S3Client.builder()
                .endpointOverride(URI.create(s3Endpoint.trim()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(s3AccessKey.trim(), s3SecretKey.trim())))
                .region(Region.of(StringUtils.hasText(s3Region) ? s3Region.trim() : "ap-south-1"))
                .forcePathStyle(true)
                .build() : null;
    }

    PersonalDocumentService(PersonalDocumentRepository repository, AccountRepository accountRepository,
            String uploadDir, long maxFileSize) {
        this(repository, accountRepository, null, null, uploadDir, maxFileSize,
                "local", "", "", "", "ap-south-1", "");
    }

    @Transactional(readOnly = true)
    public Page<PersonalDocumentDto> list(Long accountId, Long userId, String query, PersonalDocumentCategory category,
            String status, int page, int size, String sort, Sort.Direction direction) {
        requireIndividualAccount(accountId);
        if (page < 0 || size < 1 || size > 100) throw new ValidationException("Invalid page or size");
        Set<String> allowedSorts = Set.of("createdAt", "title", "expiryDate");
        String sortField = allowedSorts.contains(sort) ? sort : "createdAt";
        List<Long> sharedIds = shareRepository.findBySharedWithUserId(userId).stream()
                .map(s -> s.getDocument().getId()).toList();
        Specification<PersonalDocument> spec = (root, ignored, cb) -> cb.or(
                cb.equal(root.get("uploadedBy"), userId), root.get("id").in(sharedIds));
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
        return repository.findAll(spec, pageable).map(d -> toDto(d, userId));
    }

    @Transactional(readOnly = true)
    public PersonalDocumentDto get(Long accountId, Long userId, Long id) {
        requireIndividualAccount(accountId);
        return toDto(findAccessible(userId, id), userId);
    }

    @Transactional
    public PersonalDocumentDto create(Long accountId, Long userId, PersonalDocumentMetadataRequest request, MultipartFile file) {
        Account account = requireIndividualAccount(accountId);
        validateMetadata(request);
        validateFile(file);
        String original = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "document"));
        String stored = UUID.randomUUID() + "." + extension(original);
        String storedFileName = "documents/" + accountId + "/" + stored;
        try {
            storeFile(accountId, stored, storedFileName, file);
            PersonalDocument entity = PersonalDocument.builder().account(account).title(request.getTitle().trim())
                    .category(request.getCategory()).issuer(clean(request.getIssuer()))
                    .documentNumber(clean(request.getDocumentNumber())).issueDate(request.getIssueDate())
                    .expiryDate(request.getExpiryDate()).tags(clean(request.getTags())).notes(clean(request.getNotes()))
                    .originalFileName(original).storedFileName(storedFileName)
                    .contentType(Objects.requireNonNullElse(file.getContentType(), "application/octet-stream"))
                    .fileSize(file.getSize()).uploadedBy(userId).build();
            try { return toDto(repository.save(entity)); }
            catch (RuntimeException ex) { deleteStoredFile(storedFileName); throw ex; }
        } catch (IOException | S3Exception ex) {
            throw new ValidationException("Unable to store uploaded file", ex);
        }
    }

    @Transactional
    public PersonalDocumentDto update(Long accountId, Long userId, Long id, PersonalDocumentMetadataRequest request) {
        requireIndividualAccount(accountId);
        validateMetadata(request);
        PersonalDocument entity = findOwned(userId, id);
        entity.setTitle(request.getTitle().trim()); entity.setCategory(request.getCategory());
        entity.setIssuer(clean(request.getIssuer())); entity.setDocumentNumber(clean(request.getDocumentNumber()));
        entity.setIssueDate(request.getIssueDate()); entity.setExpiryDate(request.getExpiryDate());
        entity.setTags(clean(request.getTags())); entity.setNotes(clean(request.getNotes()));
        return toDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public Resource load(Long accountId, Long userId, Long id) {
        requireIndividualAccount(accountId);
        PersonalDocument entity = findAccessible(userId, id);
        if (s3Enabled) return loadFromS3(entity.getStoredFileName());
        try {
            Path path = uploadRoot.resolve(entity.getStoredFileName()).normalize();
            ensureUnderRoot(path);
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) throw new ResourceNotFoundException("Document file not found");
            return resource;
        } catch (java.net.MalformedURLException ex) { throw new ResourceNotFoundException("Document file not found"); }
    }

    @Transactional
    public void delete(Long accountId, Long userId, Long id) {
        requireIndividualAccount(accountId);
        PersonalDocument entity = findOwned(userId, id);
        repository.delete(entity);
        deleteStoredFile(entity.getStoredFileName());
    }

    @Transactional(readOnly = true)
    public PersonalDocumentSummaryDto summary(Long accountId, Long userId) {
        requireIndividualAccount(accountId);
        LocalDate today = LocalDate.now();
        List<Long> ids = shareRepository.findBySharedWithUserId(userId).stream().map(s -> s.getDocument().getId()).toList();
        Specification<PersonalDocument> visible = (r, q, cb) -> cb.or(cb.equal(r.get("uploadedBy"), userId), r.get("id").in(ids));
        long total = repository.count(visible);
        long expired = repository.count(visible.and((r, q, cb) -> cb.lessThan(r.get("expiryDate"), today)));
        long soon = repository.count(visible.and((r, q, cb) -> cb.between(r.get("expiryDate"), today, today.plusDays(30))));
        return PersonalDocumentSummaryDto.builder().total(total).expired(expired).expiringSoon(soon).build();
    }

    private Specification<PersonalDocument> userSpec(Long id) { return (r, q, cb) -> cb.equal(r.get("uploadedBy"), id); }
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
    public void share(Long accountId, Long userId, Long id, PersonalDocumentShareRequest request) {
        requireIndividualAccount(accountId);
        PersonalDocument document = findOwned(userId, id);
        String recipient = request.getRecipient().trim();
        User target = recipient.contains("@") ? userRepository.findByEmailIgnoreCase(recipient).orElse(null)
                : userRepository.findByMobile(recipient).orElse(null);
        if (target == null || !Boolean.TRUE.equals(target.getActive())) throw new ResourceNotFoundException("User not found");
        if (target.getId().equals(userId)) throw new ValidationException("You already own this document");
        if (shareRepository.existsByDocumentIdAndSharedWithUserId(id, target.getId()))
            throw new ValidationException("Document is already shared with this user");
        shareRepository.save(PersonalDocumentShare.builder().document(document).sharedByUserId(userId)
                .sharedWithUserId(target.getId()).build());
    }
    private PersonalDocument findOwned(Long userId, Long id) { return repository.findByIdAndUploadedBy(id, userId).orElseThrow(() -> new ResourceNotFoundException("Document not found")); }
    private PersonalDocument findAccessible(Long userId, Long id) {
        return repository.findById(id).filter(d -> d.getUploadedBy().equals(userId)
                || shareRepository.existsByDocumentIdAndSharedWithUserId(id, userId))
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    }
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
    private void storeFile(Long accountId, String stored, String storedFileName, MultipartFile file) throws IOException {
        if (s3Enabled) {
            s3Client.putObject(PutObjectRequest.builder().bucket(s3Bucket).key(storedFileName)
                            .contentType(Objects.requireNonNullElse(file.getContentType(), "application/octet-stream"))
                            .contentLength(file.getSize()).build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return;
        }
        Path directory = uploadRoot.resolve("documents").resolve(String.valueOf(accountId)).normalize();
        ensureUnderRoot(directory);
        Path target = directory.resolve(stored).normalize();
        ensureUnderRoot(target);
        Files.createDirectories(directory);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    }
    private Resource loadFromS3(String storedFileName) {
        try {
            ResponseInputStream<GetObjectResponse> stream = s3Client.getObject(GetObjectRequest.builder()
                    .bucket(s3Bucket).key(storedFileName).build());
            return new InputStreamResource(stream);
        } catch (S3Exception ex) {
            throw new ResourceNotFoundException("Document file not found");
        }
    }
    private void deleteStoredFile(String storedFileName) {
        if (s3Enabled) {
            try { s3Client.deleteObject(DeleteObjectRequest.builder().bucket(s3Bucket).key(storedFileName).build()); }
            catch (S3Exception ignored) { }
            return;
        }
        try {
            Path path = uploadRoot.resolve(storedFileName).normalize(); ensureUnderRoot(path); Files.deleteIfExists(path);
        } catch (IOException ignored) { }
    }
    private String extension(String name) {
        String clean = StringUtils.cleanPath(Objects.requireNonNullElse(name, "")); int dot = clean.lastIndexOf('.');
        if (dot < 0 || dot == clean.length() - 1) throw new ValidationException("Upload file must have an extension");
        return clean.substring(dot + 1).toLowerCase();
    }
    private void ensureUnderRoot(Path path) { if (!path.startsWith(uploadRoot)) throw new ValidationException("Invalid upload path"); }
    private String clean(String value) { return StringUtils.hasText(value) ? value.trim() : null; }
    public boolean storageAvailable() {
        if (s3Enabled) {
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(s3Bucket).build());
                return true;
            } catch (S3Exception ex) { return false; }
        }
        return Files.exists(uploadRoot) ? Files.isDirectory(uploadRoot) && Files.isReadable(uploadRoot)
                : uploadRoot.getParent() != null && Files.isWritable(uploadRoot.getParent());
    }
    private PersonalDocumentDto toDto(PersonalDocument d) { return toDto(d, d.getUploadedBy()); }
    private PersonalDocumentDto toDto(PersonalDocument d, Long userId) {
        return PersonalDocumentDto.builder().id(d.getId()).title(d.getTitle()).category(d.getCategory()).issuer(d.getIssuer())
                .documentNumber(d.getDocumentNumber()).issueDate(d.getIssueDate()).expiryDate(d.getExpiryDate())
                .tags(d.getTags()).notes(d.getNotes()).originalFileName(d.getOriginalFileName()).contentType(d.getContentType())
                .fileSize(d.getFileSize()).uploadedBy(d.getUploadedBy()).sharedWithMe(!d.getUploadedBy().equals(userId))
                .createdAt(d.getCreatedAt()).updatedAt(d.getUpdatedAt()).build();
    }
}
