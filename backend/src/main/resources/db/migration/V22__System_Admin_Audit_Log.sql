CREATE TABLE system_admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id BIGINT,
    outcome VARCHAR(20) NOT NULL,
    ip_address VARCHAR(64),
    metadata VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_admin_audit_created
    ON system_admin_audit_logs(created_at DESC);
CREATE INDEX idx_system_admin_audit_actor
    ON system_admin_audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_system_admin_audit_action_outcome
    ON system_admin_audit_logs(action, outcome, created_at DESC);
