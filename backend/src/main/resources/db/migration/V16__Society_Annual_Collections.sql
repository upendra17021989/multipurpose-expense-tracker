CREATE TABLE society_annual_collections (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    flat_id BIGINT NULL,
    financial_year VARCHAR(9) NOT NULL,
    collection_type VARCHAR(30) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    reference_number VARCHAR(100),
    remarks VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_annual_collection_account FOREIGN KEY (account_id) REFERENCES accounts(id),
    CONSTRAINT fk_annual_collection_flat FOREIGN KEY (flat_id) REFERENCES flats(id)
);
CREATE INDEX idx_annual_collection_account_year ON society_annual_collections(account_id, financial_year);
