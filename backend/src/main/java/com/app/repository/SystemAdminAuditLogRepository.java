package com.app.repository;

import com.app.entity.SystemAdminAuditLog;
import org.springframework.data.jpa.repository.*;

public interface SystemAdminAuditLogRepository extends JpaRepository<SystemAdminAuditLog, Long>,
        JpaSpecificationExecutor<SystemAdminAuditLog> {
}
