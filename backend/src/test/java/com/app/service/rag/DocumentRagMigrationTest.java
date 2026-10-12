package com.app.service.rag;

import org.junit.jupiter.api.Test;
import java.sql.DriverManager;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class DocumentRagMigrationTest {
    @Test void migrationEnforcesDocumentExistenceAndCascadesIndexDeletion() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:rag-migration;MODE=PostgreSQL", "sa", "");
             var statement = connection.createStatement();
             var input = getClass().getResourceAsStream("/db/migration/V60__Private_Document_Rag.sql")) {
            statement.execute("CREATE TABLE personal_documents (id BIGINT PRIMARY KEY)");
            for (String sql : new String(input.readAllBytes(), StandardCharsets.UTF_8).split(";")) {
                if (!sql.isBlank()) statement.execute(sql);
            }
            assertThrows(java.sql.SQLException.class, () -> statement.execute("INSERT INTO personal_document_rag(document_id,generation,status,updated_at) VALUES(1,'g','READY',CURRENT_TIMESTAMP)"));
            statement.execute("INSERT INTO personal_documents VALUES (1)");
            statement.execute("INSERT INTO personal_document_rag(document_id,generation,status,updated_at) VALUES(1,'g','READY',CURRENT_TIMESTAMP)");
            statement.execute("DELETE FROM personal_documents WHERE id=1");
            try (var result = statement.executeQuery("SELECT COUNT(*) FROM personal_document_rag")) {
                result.next(); assertEquals(0, result.getInt(1));
            }
        }
    }
}
