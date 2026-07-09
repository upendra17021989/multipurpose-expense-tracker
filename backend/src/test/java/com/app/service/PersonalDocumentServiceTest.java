package com.app.service;

import com.app.dto.PersonalDocumentMetadataRequest;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PersonalDocumentServiceTest {
    @TempDir Path tempDir;
    private PersonalDocumentRepository repository;
    private AccountRepository accountRepository;
    private PersonalDocumentService service;

    @BeforeEach
    void setUp() {
        repository = mock(PersonalDocumentRepository.class);
        accountRepository = mock(AccountRepository.class);
        service = new PersonalDocumentService(repository, accountRepository, tempDir.toString(), 1024);
    }

    @Test
    void rejectsNonIndividualAccount() {
        Account account = Account.builder().id(4L).accountType(AccountType.SOCIETY).active(true).build();
        when(accountRepository.findById(4L)).thenReturn(Optional.of(account));
        assertThrows(UnauthorizedException.class, () -> service.get(4L, 2L, 1L));
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsExpiryBeforeIssueDate() {
        allowIndividual();
        PersonalDocumentMetadataRequest request = request();
        request.setIssueDate(LocalDate.of(2026, 7, 10));
        request.setExpiryDate(LocalDate.of(2026, 7, 9));
        MockMultipartFile file = new MockMultipartFile("file", "policy.pdf", "application/pdf", new byte[]{1});
        ValidationException error = assertThrows(ValidationException.class, () -> service.create(1L, 2L, request, file));
        assertTrue(error.getMessage().contains("Expiry date"));
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsUnsupportedFileWithoutWritingMetadata() {
        allowIndividual();
        MockMultipartFile file = new MockMultipartFile("file", "secrets.exe", "application/octet-stream", new byte[]{1});
        assertThrows(ValidationException.class, () -> service.create(1L, 2L, request(), file));
        verify(repository, never()).save(any());
    }

    @Test
    void createsUserOwnedDocument() {
        Account account = allowIndividual();
        when(repository.save(any(PersonalDocument.class))).thenAnswer(invocation -> {
            PersonalDocument document = invocation.getArgument(0); document.setId(9L); return document;
        });
        MockMultipartFile file = new MockMultipartFile("file", "policy.pdf", "application/pdf", new byte[]{1, 2});
        var result = service.create(1L, 2L, request(), file);
        assertEquals(9L, result.getId());
        verify(repository).save(argThat(document -> document.getAccount() == account
                && document.getStoredFileName().startsWith("documents/1/") && document.getUploadedBy().equals(2L)));
    }

    private Account allowIndividual() {
        Account account = Account.builder().id(1L).accountType(AccountType.INDIVIDUAL).active(true).build();
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        return account;
    }

    private PersonalDocumentMetadataRequest request() {
        PersonalDocumentMetadataRequest request = new PersonalDocumentMetadataRequest();
        request.setTitle("Health policy"); request.setCategory(PersonalDocumentCategory.INSURANCE_POLICY);
        return request;
    }
}
