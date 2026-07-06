CREATE TABLE personal_documents (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(40) NOT NULL,
    issuer VARCHAR(150), document_number VARCHAR(150),
    issue_date DATE, expiry_date DATE,
    tags VARCHAR(500), notes VARCHAR(1000),
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL UNIQUE,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    uploaded_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    CHECK (issue_date IS NULL OR expiry_date IS NULL OR expiry_date >= issue_date)
);
CREATE INDEX idx_personal_documents_account_created ON personal_documents(account_id, created_at DESC);
CREATE INDEX idx_personal_documents_account_category ON personal_documents(account_id, category);
CREATE INDEX idx_personal_documents_account_expiry ON personal_documents(account_id, expiry_date);
