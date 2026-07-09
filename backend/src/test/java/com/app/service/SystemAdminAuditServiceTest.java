package com.app.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.app.entity.*;
import com.app.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SystemAdminAuditServiceTest {
    @Test
    void recordsOnlyBoundedSafeFields() {
        SystemAdminAuditLogRepository logs = mock(SystemAdminAuditLogRepository.class);
        UserRepository users = mock(UserRepository.class);
        when(users.findById(2L)).thenReturn(Optional.of(User.builder().id(2L).name("Admin").build()));
        when(logs.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        SystemAdminAuditService service = new SystemAdminAuditService(logs, users);

        service.record(2L, "USER_STATUS_CHANGED", "USER", 8L, "SUCCESS", "127.0.0.1", "x".repeat(1200));

        verify(logs).save(argThat(log -> log.getActor().getId().equals(2L)
                && log.getTargetId().equals(8L) && log.getMetadata().length() == 1000
                && log.getOutcome().equals("SUCCESS")));
    }
}
