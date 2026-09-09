CREATE TABLE society_agencies (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    name VARCHAR(160) NOT NULL,
    service_category VARCHAR(80) NOT NULL,
    contact_person VARCHAR(120),
    phone VARCHAR(30),
    email VARCHAR(160),
    contract_start DATE,
    contract_end DATE,
    required_headcount INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_agency_headcount CHECK (required_headcount >= 0)
);
CREATE INDEX idx_society_agency_account ON society_agencies(account_id, active);

CREATE TABLE society_agency_workers (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    agency_id BIGINT NOT NULL REFERENCES society_agencies(id),
    worker_name VARCHAR(160) NOT NULL,
    worker_code VARCHAR(80),
    designation VARCHAR(100),
    mobile VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_agency_worker_code UNIQUE (agency_id, worker_code)
);
CREATE INDEX idx_agency_worker_account_agency ON society_agency_workers(account_id, agency_id, active);
