CREATE TABLE society_staff_access (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    staff_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STAFF_SUPERVISOR',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    granted_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP,
    suspended_at TIMESTAMP,
    revoked_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_access_account FOREIGN KEY (account_id) REFERENCES accounts(id),
    CONSTRAINT fk_staff_access_staff FOREIGN KEY (staff_id) REFERENCES society_staff(id),
    CONSTRAINT fk_staff_access_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_staff_access_granted_by FOREIGN KEY (granted_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_society_staff_access_staff UNIQUE (staff_id),
    CONSTRAINT uk_society_staff_access_account_user UNIQUE (account_id, user_id),
    CONSTRAINT ck_society_staff_access_role CHECK (role = 'STAFF_SUPERVISOR'),
    CONSTRAINT ck_society_staff_access_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED'))
);

CREATE INDEX idx_staff_access_user_status
    ON society_staff_access(user_id, status);

CREATE INDEX idx_staff_access_account_status
    ON society_staff_access(account_id, status);
