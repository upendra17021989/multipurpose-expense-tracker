CREATE TABLE sports_members (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(255),
    role VARCHAR(100),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_sports_members_account_id ON sports_members(account_id);

CREATE TABLE sports_events (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget_amount DECIMAL(10,2),
    collected_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    total_expense DECIMAL(10,2) DEFAULT 0 NOT NULL,
    balance_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'PLANNED' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_sports_events_account_id ON sports_events(account_id);
CREATE INDEX idx_sports_events_year ON sports_events(year);

CREATE TABLE sports_expenses (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    sports_event_id BIGINT,
    expense_date DATE NOT NULL,
    category VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255),
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    utr VARCHAR(255),
    cheque_number VARCHAR(255),
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    soft_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (sports_event_id) REFERENCES sports_events(id)
);

CREATE INDEX idx_sports_expenses_account_id ON sports_expenses(account_id);
CREATE INDEX idx_sports_expenses_event_id ON sports_expenses(sports_event_id);
CREATE INDEX idx_sports_expenses_date ON sports_expenses(expense_date);

CREATE TABLE sports_collections (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    sports_event_id BIGINT NOT NULL,
    sports_member_id BIGINT NOT NULL,
    expected_amount DECIMAL(10,2) NOT NULL,
    collected_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    pending_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    excess_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    refunded_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (sports_event_id) REFERENCES sports_events(id),
    FOREIGN KEY (sports_member_id) REFERENCES sports_members(id),
    UNIQUE(sports_event_id, sports_member_id)
);

CREATE INDEX idx_sports_collections_account_id ON sports_collections(account_id);
CREATE INDEX idx_sports_collections_event_id ON sports_collections(sports_event_id);
CREATE INDEX idx_sports_collections_member_id ON sports_collections(sports_member_id);

CREATE TABLE sports_collection_receipts (
    id BIGSERIAL PRIMARY KEY,
    sports_collection_id BIGINT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    utr VARCHAR(255),
    cheque_number VARCHAR(255),
    collected_by VARCHAR(255) NOT NULL,
    receipt_number VARCHAR(100) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (sports_collection_id) REFERENCES sports_collections(id)
);

CREATE INDEX idx_sports_collection_receipts_collection_id ON sports_collection_receipts(sports_collection_id);