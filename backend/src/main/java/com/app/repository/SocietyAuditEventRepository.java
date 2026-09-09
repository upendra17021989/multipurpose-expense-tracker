package com.app.repository;
import com.app.entity.SocietyAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SocietyAuditEventRepository extends JpaRepository<SocietyAuditEvent, Long> {}
