CREATE TABLE society_shifts (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_minutes INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_shift_grace CHECK (grace_minutes >= 0),
    CONSTRAINT uk_society_shift_name UNIQUE (account_id, name)
);

CREATE TABLE society_roster_assignments (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    shift_id BIGINT NOT NULL REFERENCES society_shifts(id),
    staff_id BIGINT REFERENCES society_staff(id),
    agency_worker_id BIGINT REFERENCES society_agency_workers(id),
    post_name VARCHAR(120) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_roster_assignee CHECK ((staff_id IS NOT NULL AND agency_worker_id IS NULL) OR (staff_id IS NULL AND agency_worker_id IS NOT NULL)),
    CONSTRAINT ck_roster_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX idx_shift_account_active ON society_shifts(account_id, active);
CREATE INDEX idx_roster_account_active ON society_roster_assignments(account_id, active);
