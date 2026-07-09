CREATE TABLE personal_document_shares (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES personal_documents(id) ON DELETE CASCADE,
    shared_with_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (document_id, shared_with_user_id)
);
CREATE INDEX idx_personal_document_shares_recipient
    ON personal_document_shares(shared_with_user_id, created_at DESC);
