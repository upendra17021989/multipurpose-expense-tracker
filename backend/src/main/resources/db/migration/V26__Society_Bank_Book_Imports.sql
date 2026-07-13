CREATE TABLE society_bank_book_imports (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    imported_by_user_id BIGINT NOT NULL REFERENCES users(id),
    batch_id VARCHAR(36) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    financial_year VARCHAR(9) NOT NULL,
    total_rows INTEGER NOT NULL,
    created_rows INTEGER NOT NULL,
    skipped_rows INTEGER NOT NULL,
    imported_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE society_bank_book_transactions (
    id BIGSERIAL PRIMARY KEY,
    import_id BIGINT NOT NULL REFERENCES society_bank_book_imports(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    flat_id BIGINT REFERENCES flats(id),
    annual_collection_id BIGINT REFERENCES society_annual_collections(id),
    row_number INTEGER NOT NULL,
    source_reference VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(100),
    flat_text VARCHAR(100),
    particulars VARCHAR(1000),
    transaction_id VARCHAR(255),
    bank_reference VARCHAR(255),
    voucher_number VARCHAR(100),
    settlement_id VARCHAR(255),
    debit DECIMAL(15,2),
    credit DECIMAL(15,2),
    balance DECIMAL(15,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_society_bank_transaction_reference UNIQUE(account_id, source_reference)
);
CREATE INDEX idx_society_bank_import_account ON society_bank_book_imports(account_id, created_at);
CREATE INDEX idx_society_bank_transaction_flat ON society_bank_book_transactions(account_id, flat_id);
