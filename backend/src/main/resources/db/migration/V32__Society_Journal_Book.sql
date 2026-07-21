CREATE TABLE society_journal_entries (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    financial_year VARCHAR(9) NOT NULL,
    entry_date DATE NOT NULL,
    reference_number VARCHAR(100),
    voucher_type VARCHAR(50) NOT NULL,
    voucher_number VARCHAR(100) NOT NULL,
    narration VARCHAR(1000),
    source VARCHAR(30) NOT NULL DEFAULT 'JOURNAL_IMPORT',
    status VARCHAR(20) NOT NULL DEFAULT 'POSTED',
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_society_journal_voucher UNIQUE (account_id, financial_year, voucher_number)
);

CREATE TABLE society_journal_lines (
    id BIGSERIAL PRIMARY KEY,
    journal_entry_id BIGINT NOT NULL REFERENCES society_journal_entries(id) ON DELETE CASCADE,
    flat_id BIGINT REFERENCES flats(id),
    line_number INTEGER NOT NULL,
    ledger_name VARCHAR(255) NOT NULL,
    particulars VARCHAR(1000),
    debit NUMERIC(15,2) NOT NULL DEFAULT 0,
    credit NUMERIC(15,2) NOT NULL DEFAULT 0,
    CONSTRAINT ck_society_journal_line_amount CHECK (
        (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
    )
);

CREATE INDEX idx_society_journal_account_date ON society_journal_entries(account_id, entry_date DESC);
CREATE INDEX idx_society_journal_line_flat ON society_journal_lines(flat_id);
