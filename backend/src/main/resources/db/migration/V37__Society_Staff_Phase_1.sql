ALTER TABLE society_staff ADD COLUMN employment_type VARCHAR(20) NOT NULL DEFAULT 'DIRECT';
ALTER TABLE society_staff ADD COLUMN agency_name VARCHAR(160);
ALTER TABLE society_staff ADD CONSTRAINT ck_society_staff_employment_type
    CHECK (employment_type IN ('DIRECT', 'AGENCY', 'CONTRACT'));

CREATE TABLE society_staff_invitations (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    staff_id BIGINT NOT NULL REFERENCES society_staff(id),
    invited_by_user_id BIGINT NOT NULL REFERENCES users(id),
    contact VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_staff_invitation_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'))
);
CREATE INDEX idx_staff_invitation_staff_status ON society_staff_invitations(staff_id, status);

CREATE TABLE society_audit_events (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    actor_user_id BIGINT REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    details VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_society_audit_account_created ON society_audit_events(account_id, created_at DESC);
