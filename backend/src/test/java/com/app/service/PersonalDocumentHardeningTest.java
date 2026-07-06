package com.app.service;

import com.app.dto.PersonalDocumentMetadataRequest;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class PersonalDocumentHardeningTest {
    @TempDir Path tempDir;
    private PersonalDocumentRepository repository;
    private AccountRepository accounts;
    private PersonalDocumentService service;

    @BeforeEach void setUp() {
        repository = mock(PersonalDocumentRepository.class);
        accounts = mock(AccountRepository.class);
        service = new PersonalDocumentService(repository, accounts, tempDir.toString(), 1024);
        when(accounts.findById(1L)).thenReturn(Optional.of(Account.builder().id(1L).active(true).accountType(AccountType.INDIVIDUAL).build()));
    }

    @Test void rejectsExtensionAndMimeMismatch() {
        MockMultipartFile disguised = new MockMultipartFile("file", "policy.pdf", "image/png", new byte[]{1});
        assertThrows(ValidationException.class, () -> service.create(1L, 2L, request(), disguised));
        verify(repository, never()).save(any());
    }

    @Test void knownIdFromAnotherAccountIsNotAccessible() {
        when(repository.findByIdAndAccountId(99L, 1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.get(1L, 99L));
    }

    private PersonalDocumentMetadataRequest request() {
        PersonalDocumentMetadataRequest request = new PersonalDocumentMetadataRequest();
        request.setTitle("Policy"); request.setCategory(PersonalDocumentCategory.INSURANCE_POLICY);
        return request;
    }
}
