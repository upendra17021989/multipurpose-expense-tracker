CREATE TABLE society_work_orders (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    work_order_number VARCHAR(30) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(2000), category VARCHAR(30) NOT NULL, source VARCHAR(30) NOT NULL,
    location VARCHAR(250), priority VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    planned_start TIMESTAMP, due_at TIMESTAMP, actual_start TIMESTAMP, completed_at TIMESTAMP,
    completion_notes VARCHAR(2000), estimated_cost NUMERIC(12,2), actual_cost NUMERIC(12,2),
    verified_by_user_id BIGINT REFERENCES users(id), verified_at TIMESTAMP,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_society_work_order_number UNIQUE(account_id, work_order_number),
    CONSTRAINT ck_work_order_status CHECK(status IN ('OPEN','ASSIGNED','IN_PROGRESS','BLOCKED','COMPLETED','VERIFIED','CANCELLED'))
);
CREATE INDEX idx_work_orders_account_status_due ON society_work_orders(account_id,status,due_at);

CREATE TABLE society_work_assignments (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id),
    work_order_id BIGINT NOT NULL REFERENCES society_work_orders(id),
    staff_id BIGINT REFERENCES society_staff(id), agency_id BIGINT REFERENCES society_agencies(id), vendor_id BIGINT REFERENCES suppliers(id),
    assigned_by_user_id BIGINT NOT NULL REFERENCES users(id), assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_work_assignment_one_assignee CHECK (
      (CASE WHEN staff_id IS NULL THEN 0 ELSE 1 END) + (CASE WHEN agency_id IS NULL THEN 0 ELSE 1 END) + (CASE WHEN vendor_id IS NULL THEN 0 ELSE 1 END) = 1)
);
CREATE INDEX idx_work_assignments_work_order ON society_work_assignments(account_id,work_order_id,active);

CREATE TABLE society_work_updates (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id),
    work_order_id BIGINT NOT NULL REFERENCES society_work_orders(id),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id), update_type VARCHAR(30) NOT NULL,
    previous_status VARCHAR(20), new_status VARCHAR(20), notes VARCHAR(2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_work_updates_work_order ON society_work_updates(account_id,work_order_id,created_at);

