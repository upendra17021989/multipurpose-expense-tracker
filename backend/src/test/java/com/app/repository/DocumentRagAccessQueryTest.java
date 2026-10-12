package com.app.repository;

import com.app.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect", "debug=false", "spring.profiles.active=test",
        "spring.config.import=", "logging.level.root=WARN", "spring.datasource.url=jdbc:h2:mem:document-rag;NON_KEYWORDS=YEAR,MONTH",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.properties.hibernate.hbm2ddl.halt_on_error=true"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = DocumentRagAccessQueryTest.JpaConfiguration.class)
class DocumentRagAccessQueryTest {
    @Configuration @EntityScan(basePackages = "com.app.entity")
    @EnableJpaRepositories(basePackages = "com.app.repository", includeFilters = @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE, classes = {PersonalDocumentRepository.class, AccountRepository.class, DocumentRagIndexRepository.class}))
    static class JpaConfiguration {}
    @Autowired TestEntityManager em;
    @Autowired PersonalDocumentRepository documents;
    @Autowired AccountRepository accounts;
    @Autowired DocumentRagIndexRepository indexes;

    @Test void onlyOwnerOrCurrentShareCanReadAndInactiveSourceIsExcluded() {
        var owner = em.persist(User.builder().name("Owner").mobile("1111111111").passwordHash("unused").build());
        var reader = em.persist(User.builder().name("Reader").mobile("2222222222").passwordHash("unused").build());
        var account = em.persist(Account.builder().user(owner).accountType(AccountType.INDIVIDUAL).accountName("Personal").build());
        var document = em.persist(PersonalDocument.builder().account(account).uploadedBy(owner.getId()).title("Policy")
                .category(PersonalDocumentCategory.OTHER).originalFileName("policy.txt").storedFileName("policy.txt")
                .contentType("text/plain").fileSize(20L).build());
        em.flush();
        assertEquals(1, documents.countAccessibleForRag(document.getId(), owner.getId()));
        assertEquals(0, documents.countAccessibleForRag(document.getId(), reader.getId()));
        assertTrue(accounts.existsByIdAndUserIdAndAccountTypeAndActiveTrue(account.getId(), owner.getId(), AccountType.INDIVIDUAL));
        assertFalse(accounts.existsByIdAndUserIdAndAccountTypeAndActiveTrue(account.getId(), reader.getId(), AccountType.INDIVIDUAL));
        var share = em.persist(PersonalDocumentShare.builder().document(document).sharedByUserId(owner.getId()).sharedWithUserId(reader.getId()).build());
        em.flush();
        assertEquals(1, documents.countAccessibleForRag(document.getId(), reader.getId()));
        em.remove(share); em.flush();
        assertEquals(0, documents.countAccessibleForRag(document.getId(), reader.getId()));
        account.setActive(false); em.flush();
        assertEquals(0, documents.countAccessibleForRag(document.getId(), owner.getId()));
    }

    @Test void currentConsentQueriesIgnoreCachedIndexEntities() {
        var index = new DocumentRagIndex(); index.setDocumentId(99L); index.setGeneration("original");
        index.setStatus("READY"); index.setUpdatedAt(LocalDateTime.now()); em.persistAndFlush(index);
        assertEquals(1, indexes.countCurrent(99L, "original", "READY"));
        em.getEntityManager().createNativeQuery("UPDATE personal_document_rag SET generation = 'replacement' WHERE document_id = 99").executeUpdate();
        assertEquals("original", index.getGeneration()); // entity is still cached
        assertEquals(0, indexes.countCurrent(99L, "original", "READY"));
        assertEquals(1, indexes.countCurrent(99L, "replacement", "READY"));
    }
}
