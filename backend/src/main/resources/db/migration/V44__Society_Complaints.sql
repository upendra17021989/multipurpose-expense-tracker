CREATE TABLE society_complaints (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id),
    complaint_number VARCHAR(30) NOT NULL, flat_id BIGINT NOT NULL REFERENCES flats(id),
    complainant_user_id BIGINT NOT NULL REFERENCES users(id), complainant_name VARCHAR(150) NOT NULL,
    title VARCHAR(180) NOT NULL, description VARCHAR(2000) NOT NULL, category VARCHAR(30) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL', status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    work_order_id BIGINT REFERENCES society_work_orders(id), acknowledged_at TIMESTAMP, resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_society_complaint_number UNIQUE(account_id, complaint_number),
    CONSTRAINT ck_society_complaint_status CHECK(status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','CLOSED'))
);
CREATE INDEX idx_complaints_account_status ON society_complaints(account_id,status,created_at);
CREATE TABLE society_complaint_updates (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id),
    complaint_id BIGINT NOT NULL REFERENCES society_complaints(id), created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20), notes VARCHAR(2000) NOT NULL, resident_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_complaint_updates_complaint ON society_complaint_updates(account_id,complaint_id,created_at);

