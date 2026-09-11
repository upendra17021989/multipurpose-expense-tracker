CREATE TABLE society_daily_checklist_templates (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), title VARCHAR(180) NOT NULL,
    description VARCHAR(1000), sort_order INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_society_checklist_template_account ON society_daily_checklist_templates(account_id, active);

CREATE TABLE society_daily_checklist_entries (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), template_id BIGINT NOT NULL REFERENCES society_daily_checklist_templates(id),
    operation_date DATE NOT NULL, completed BOOLEAN NOT NULL DEFAULT FALSE, notes VARCHAR(1000),
    completed_by_user_id BIGINT REFERENCES users(id), completed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(account_id, template_id, operation_date)
);
CREATE INDEX idx_society_checklist_entry_day ON society_daily_checklist_entries(account_id, operation_date);

CREATE TABLE society_incidents (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), incident_number VARCHAR(30) NOT NULL,
    title VARCHAR(180) NOT NULL, description VARCHAR(2000) NOT NULL, severity VARCHAR(20) NOT NULL, location VARCHAR(255),
    occurred_at TIMESTAMP NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'OPEN', immediate_action VARCHAR(2000),
    follow_up VARCHAR(2000), sensitive BOOLEAN NOT NULL DEFAULT FALSE, closed_at TIMESTAMP,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id), closed_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, incident_number)
);
CREATE INDEX idx_society_incident_account ON society_incidents(account_id, occurred_at);

CREATE TABLE society_inspections (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), title VARCHAR(180) NOT NULL,
    location VARCHAR(255), scheduled_for TIMESTAMP, completed_at TIMESTAMP, result VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    checklist VARCHAR(4000), notes VARCHAR(2000), failure_action VARCHAR(2000), work_order_id BIGINT REFERENCES society_work_orders(id),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id), completed_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_society_inspection_account ON society_inspections(account_id, scheduled_for);

CREATE TABLE society_shift_handovers (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), shift_date DATE NOT NULL,
    shift_name VARCHAR(100) NOT NULL, open_items VARCHAR(3000), incidents VARCHAR(2000), expected_visitors VARCHAR(2000),
    assets_handed_over VARCHAR(2000), equipment_status VARCHAR(2000), attendance_shortages VARCHAR(1000), notes VARCHAR(2000),
    sender_user_id BIGINT NOT NULL REFERENCES users(id), receiver_name VARCHAR(180), receiver_user_id BIGINT REFERENCES users(id),
    acknowledged_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_society_handover_account ON society_shift_handovers(account_id, shift_date);

CREATE TABLE society_daily_reports (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), report_date DATE NOT NULL, revision INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', summary VARCHAR(4000), next_day_priorities VARCHAR(2000), snapshot_json TEXT NOT NULL,
    submitted_by_user_id BIGINT REFERENCES users(id), submitted_at TIMESTAMP, acknowledged_by_user_id BIGINT REFERENCES users(id),
    acknowledged_at TIMESTAMP, admin_comment VARCHAR(2000), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(account_id, report_date, revision)
);
CREATE INDEX idx_society_daily_report_account ON society_daily_reports(account_id, report_date);
