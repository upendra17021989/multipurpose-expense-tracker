package com.app.service;

import com.app.dto.AttachmentDto;
import com.app.entity.Account;
import com.app.entity.Attachment;
import com.app.entity.Expense;
import com.app.entity.ReferenceType;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.AttachmentRepository;
import com.app.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AttachmentService {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "jfif", "png", "pdf");

    private final AttachmentRepository attachmentRepository;
    private final ExpenseRepository expenseRepository;
    private final Path uploadRoot;
    private final long maxFileSize;

    public AttachmentService(
            AttachmentRepository attachmentRepository,
            ExpenseRepository expenseRepository,
            @Value("${app.file.upload.dir:./uploads}") String uploadDir,
            @Value("${app.file.max-size:5242880}") long maxFileSize) {
        this.attachmentRepository = attachmentRepository;
        this.expenseRepository = expenseRepository;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.maxFileSize = maxFileSize;
    }

    @Transactional(readOnly = true)
    public List<AttachmentDto> getAttachments(Long accountId, ReferenceType referenceType, Long referenceId) {
        validateReference(accountId, referenceType, referenceId);
        return attachmentRepository.findByAccountIdAndReferenceTypeAndReferenceId(accountId, referenceType, referenceId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public AttachmentDto upload(Long accountId, Long userId, ReferenceType referenceType, Long referenceId, MultipartFile file) {
        validateReference(accountId, referenceType, referenceId);
        validateFile(file);

        try {
            Files.createDirectories(uploadRoot);
            String originalName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "receipt");
            String extension = getExtension(originalName);
            String storedFileName = accountId + "-" + referenceType.name().toLowerCase() + "-" + referenceId + "-" + UUID.randomUUID() + "." + extension;
            Path target = uploadRoot.resolve(storedFileName).normalize();
            if (!target.startsWith(uploadRoot)) {
                throw new ValidationException("Invalid upload path");
            }
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            Account account = new Account();
            account.setId(accountId);
            Attachment attachment = Attachment.builder()
                    .account(account)
                    .referenceType(referenceType)
                    .referenceId(referenceId)
                    .fileName(originalName)
                    .fileUrl(storedFileName)
                    .fileType(file.getContentType() != null ? file.getContentType() : extension)
                    .uploadedBy(String.valueOf(userId))
                    .build();
            return mapToDto(attachmentRepository.save(attachment));
        } catch (IOException ex) {
            throw new ValidationException("Unable to store uploaded file");
        }
    }

    @Transactional(readOnly = true)
    public Resource loadAttachment(Long accountId, Long attachmentId) {
        Attachment attachment = findAttachment(accountId, attachmentId);
        try {
            Path file = uploadRoot.resolve(attachment.getFileUrl()).normalize();
            if (!file.startsWith(uploadRoot)) {
                throw new ValidationException("Invalid file path");
            }
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Uploaded file not found");
            }
            return resource;
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("Uploaded file not found");
        }
    }

    @Transactional(readOnly = true)
    public AttachmentDto getAttachment(Long accountId, Long attachmentId) {
        return mapToDto(findAttachment(accountId, attachmentId));
    }

    @Transactional
    public void deleteAttachment(Long accountId, Long attachmentId) {
        Attachment attachment = findAttachment(accountId, attachmentId);
        attachmentRepository.delete(attachment);
        try {
            Files.deleteIfExists(uploadRoot.resolve(attachment.getFileUrl()).normalize());
        } catch (IOException ignored) {
            // Metadata removal should not fail when the physical file is already gone.
        }
    }

    private Attachment findAttachment(Long accountId, Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .filter(attachment -> attachment.getAccount().getId().equals(accountId))
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
    }

    private void validateReference(Long accountId, ReferenceType referenceType, Long referenceId) {
        if (referenceType != ReferenceType.EXPENSE) {
            return;
        }
        Expense expense = expenseRepository.findById(referenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        if (!expense.getAccount().getId().equals(accountId) || Boolean.TRUE.equals(expense.getSoftDeleted())) {
            throw new ResourceNotFoundException("Expense not accessible");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Upload file is required");
        }
        if (file.getSize() > maxFileSize) {
            throw new ValidationException("Upload file is too large");
        }
        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ValidationException("Only JPG, JPEG, JFIF, PNG, and PDF uploads are allowed");
        }
    }

    private String getExtension(String fileName) {
        String cleanName = StringUtils.cleanPath(fileName != null ? fileName : "");
        int dot = cleanName.lastIndexOf('.');
        if (dot < 0 || dot == cleanName.length() - 1) {
            throw new ValidationException("Upload file must have an extension");
        }
        return cleanName.substring(dot + 1).toLowerCase();
    }

    private AttachmentDto mapToDto(Attachment attachment) {
        return AttachmentDto.builder()
                .id(attachment.getId())
                .accountId(attachment.getAccount().getId())
                .referenceType(attachment.getReferenceType())
                .referenceId(attachment.getReferenceId())
                .fileName(attachment.getFileName())
                .fileUrl("/attachments/" + attachment.getId() + "/download")
                .fileType(attachment.getFileType())
                .uploadedBy(attachment.getUploadedBy())
                .createdAt(attachment.getCreatedAt())
                .build();
    }
}

