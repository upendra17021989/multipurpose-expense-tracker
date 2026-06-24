package com.app.controller;

import com.app.dto.AttachmentDto;
import com.app.entity.ReferenceType;
import com.app.security.UserPrincipal;
import com.app.service.AttachmentService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/attachments")
public class AttachmentController {
    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public ResponseEntity<List<AttachmentDto>> getAttachments(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam ReferenceType referenceType,
            @RequestParam Long referenceId) {
        return ResponseEntity.ok(attachmentService.getAttachments(userPrincipal.getAccountId(), referenceType, referenceId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentDto> uploadAttachment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam ReferenceType referenceType,
            @RequestParam Long referenceId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(attachmentService.upload(
                userPrincipal.getAccountId(), userPrincipal.getUserId(), referenceType, referenceId, file));
    }

    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long attachmentId) {
        AttachmentDto attachment = attachmentService.getAttachment(userPrincipal.getAccountId(), attachmentId);
        Resource resource = attachmentService.loadAttachment(userPrincipal.getAccountId(), attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getFileName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long attachmentId) {
        attachmentService.deleteAttachment(userPrincipal.getAccountId(), attachmentId);
        return ResponseEntity.noContent().build();
    }
}
