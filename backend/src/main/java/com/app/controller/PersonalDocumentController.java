package com.app.controller;

import com.app.dto.*;
import com.app.entity.PersonalDocumentCategory;
import com.app.security.UserPrincipal;
import com.app.service.PersonalDocumentService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/personal/documents")
public class PersonalDocumentController {
    private final PersonalDocumentService service;

    public PersonalDocumentController(PersonalDocumentService service) { this.service = service; }

    @GetMapping
    public Page<PersonalDocumentDto> list(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) PersonalDocumentCategory category,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {
        return service.list(principal.getAccountId(), principal.getUserId(), query, category, status, page, size, sort, direction);
    }

    @GetMapping("/summary")
    public PersonalDocumentSummaryDto summary(@AuthenticationPrincipal UserPrincipal principal) {
        return service.summary(principal.getAccountId(), principal.getUserId());
    }

    @GetMapping("/{id}")
    public PersonalDocumentDto get(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return service.get(principal.getAccountId(), principal.getUserId(), id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PersonalDocumentDto create(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestPart("metadata") PersonalDocumentMetadataRequest metadata,
            @RequestPart("file") MultipartFile file) {
        return service.create(principal.getAccountId(), principal.getUserId(), metadata, file);
    }

    @PutMapping("/{id}")
    public PersonalDocumentDto update(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody PersonalDocumentMetadataRequest metadata) {
        return service.update(principal.getAccountId(), principal.getUserId(), id, metadata);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        PersonalDocumentDto document = service.get(principal.getAccountId(), principal.getUserId(), id);
        Resource resource = service.load(principal.getAccountId(), principal.getUserId(), id);
        ContentDisposition disposition = ContentDisposition.inline().filename(document.getOriginalFileName()).build();
        MediaType type;
        try { type = MediaType.parseMediaType(document.getContentType()); }
        catch (InvalidMediaTypeException ex) { type = MediaType.APPLICATION_OCTET_STREAM; }
        return ResponseEntity.ok().contentType(type).header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString()).body(resource);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        service.delete(principal.getAccountId(), principal.getUserId(), id);
    }

    @PostMapping("/{id}/share")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void share(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody PersonalDocumentShareRequest request) {
        service.share(principal.getAccountId(), principal.getUserId(), id, request);
    }
}
