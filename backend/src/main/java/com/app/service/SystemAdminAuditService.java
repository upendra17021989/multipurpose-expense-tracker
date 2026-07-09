package com.app.service;

import com.app.dto.SystemAdminAuditDto;
import com.app.entity.*;
import com.app.exception.ValidationException;
import com.app.repository.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.util.StringUtils;

@Service
public class SystemAdminAuditService {
    private final SystemAdminAuditLogRepository logs;
    private final UserRepository users;

    public SystemAdminAuditService(SystemAdminAuditLogRepository logs, UserRepository users) {
        this.logs = logs; this.users = users;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long actorId, String action, String targetType, Long targetId,
            String outcome, String ipAddress, String metadata) {
        User actor = actorId == null ? null : users.findById(actorId).orElse(null);
        logs.save(SystemAdminAuditLog.builder().actor(actor).action(clean(action, 80))
                .targetType(clean(targetType, 40)).targetId(targetId).outcome(clean(outcome, 20))
                .ipAddress(cleanNullable(ipAddress, 64)).metadata(cleanNullable(metadata, 1000)).build());
    }

    @Transactional(readOnly = true)
    public Page<SystemAdminAuditDto> list(String query, String action, String outcome, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ValidationException("Invalid page or size");
        Specification<SystemAdminAuditLog> spec = Specification.where(null);
        if (StringUtils.hasText(query)) {
            String value = "%" + query.trim().toLowerCase() + "%";
            spec = spec.and((r, q, cb) -> cb.or(cb.like(cb.lower(r.get("actor").get("name")), value),
                    cb.like(cb.lower(r.get("metadata")), value), cb.like(cb.lower(r.get("targetType")), value)));
        }
        if (StringUtils.hasText(action)) spec = spec.and((r, q, cb) -> cb.equal(r.get("action"), action.trim()));
        if (StringUtils.hasText(outcome)) spec = spec.and((r, q, cb) -> cb.equal(r.get("outcome"), outcome.trim().toUpperCase()));
        return logs.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))).map(this::map);
    }

    private SystemAdminAuditDto map(SystemAdminAuditLog log) {
        return SystemAdminAuditDto.builder().id(log.getId())
                .actorUserId(log.getActor() == null ? null : log.getActor().getId())
                .actorName(log.getActor() == null ? "Deleted user" : log.getActor().getName())
                .action(log.getAction()).targetType(log.getTargetType()).targetId(log.getTargetId())
                .outcome(log.getOutcome()).ipAddress(log.getIpAddress()).metadata(log.getMetadata())
                .createdAt(log.getCreatedAt()).build();
    }
    private String clean(String value, int max) {
        if (!StringUtils.hasText(value)) throw new ValidationException("Audit field is required");
        return value.trim().substring(0, Math.min(max, value.trim().length()));
    }
    private String cleanNullable(String value, int max) {
        return StringUtils.hasText(value) ? value.trim().substring(0, Math.min(max, value.trim().length())) : null;
    }
}
