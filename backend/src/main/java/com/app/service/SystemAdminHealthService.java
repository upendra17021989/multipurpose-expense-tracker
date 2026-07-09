package com.app.service;

import com.app.dto.SystemAdminHealthDtos.*;
import com.app.entity.PersonalDocument;
import com.app.repository.*;
import com.zaxxer.hikari.HikariDataSource;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemAdminHealthService {
    private static final int MAX_FILES = 10_000;
    private final JdbcTemplate jdbc;
    private final DataSource dataSource;
    private final PersonalDocumentRepository documents;
    private final UserRepository users;
    private final PersonalDocumentService documentStorage;
    private final String application;
    private final String version;
    private final String provider;
    private final Path uploadRoot;

    public SystemAdminHealthService(JdbcTemplate jdbc, DataSource dataSource, PersonalDocumentRepository documents,
            UserRepository users, PersonalDocumentService documentStorage,
            @Value("${spring.application.name}") String application,
            @Value("${app.version:development}") String version,
            @Value("${app.storage.provider:local}") String provider,
            @Value("${app.file.upload.dir:./uploads}") String uploadDir) {
        this.jdbc = jdbc; this.dataSource = dataSource; this.documents = documents; this.users = users;
        this.documentStorage = documentStorage;
        this.application = application; this.version = version; this.provider = provider;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public Health health() {
        String databaseStatus = "UP"; String migration = "Unknown";
        try {
            jdbc.queryForObject("select 1", Integer.class);
            migration = jdbc.queryForObject("select version from flyway_schema_history where success = true order by installed_rank desc limit 1", String.class);
        } catch (RuntimeException ex) { databaseStatus = "DOWN"; }
        String storageStatus = documentStorage.storageAvailable() ? "UP" : "DOWN";
        Integer active = null, idle = null;
        if (dataSource instanceof HikariDataSource hikari && hikari.getHikariPoolMXBean() != null) {
            active = hikari.getHikariPoolMXBean().getActiveConnections();
            idle = hikari.getHikariPoolMXBean().getIdleConnections();
        }
        return Health.builder().overallStatus("UP".equals(databaseStatus) && "UP".equals(storageStatus) ? "HEALTHY" : "DEGRADED")
                .application(application).version(version).databaseStatus(databaseStatus).databaseMigration(migration)
                .storageProvider(provider).storageStatus(storageStatus).databaseActiveConnections(active)
                .databaseIdleConnections(idle).checkedAt(LocalDateTime.now()).build();
    }

    @Transactional(readOnly = true)
    public Storage storage() {
        boolean local = "local".equalsIgnoreCase(provider);
        long missing = 0, orphan = 0; boolean truncated = false;
        if (local) {
            List<PersonalDocument> metadata = documents.findAll();
            Set<Path> expected = new HashSet<>();
            for (PersonalDocument document : metadata) {
                Path path = uploadRoot.resolve(document.getStoredFileName()).normalize();
                if (path.startsWith(uploadRoot)) {
                    expected.add(path);
                    if (!Files.isRegularFile(path)) missing++;
                }
            }
            Path root = uploadRoot.resolve("documents");
            if (Files.isDirectory(root)) {
                try (var paths = Files.walk(root)) {
                    List<Path> files = paths.filter(Files::isRegularFile).limit(MAX_FILES + 1L).toList();
                    truncated = files.size() > MAX_FILES;
                    orphan = files.stream().limit(MAX_FILES).filter(path -> !expected.contains(path.normalize())).count();
                } catch (Exception ignored) { }
            }
        }
        return Storage.builder().provider(provider).status(documentStorage.storageAvailable() ? "UP" : "DOWN")
                .totalDocuments(documents.count()).totalBytes(documents.totalStorageBytes())
                .missingFiles(missing).orphanFiles(orphan).integrityScanAvailable(local).scanTruncated(truncated)
                .topOwners(ownerRows()).topAccounts(accountRows()).checkedAt(LocalDateTime.now()).build();
    }

    private List<UsageRow> ownerRows() {
        return documents.storageByOwner(PageRequest.of(0, 10)).stream().map(row -> {
            Long id = (Long) row[0];
            String name = users.findById(id).map(user -> user.getName()).orElse("Deleted user");
            return UsageRow.builder().id(id).name(name).documentCount(((Number) row[1]).longValue())
                    .bytes(((Number) row[2]).longValue()).build();
        }).toList();
    }
    private List<UsageRow> accountRows() {
        return documents.storageByAccount(PageRequest.of(0, 10)).stream().map(row -> UsageRow.builder()
                .id((Long) row[0]).name((String) row[1]).documentCount(((Number) row[2]).longValue())
                .bytes(((Number) row[3]).longValue()).build()).toList();
    }
}
