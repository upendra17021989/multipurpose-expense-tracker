CREATE TABLE personal_todos (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    title VARCHAR(160) NOT NULL,
    notes VARCHAR(1000),
    due_date DATE,
    priority VARCHAR(12) NOT NULL DEFAULT 'MEDIUM',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_personal_todos_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT chk_personal_todos_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'))
);

CREATE INDEX idx_personal_todos_account_status_due
    ON personal_todos(account_id, completed, due_date, created_at DESC);
