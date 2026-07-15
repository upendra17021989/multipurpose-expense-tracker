CREATE TABLE user_feedback (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    feedback_type VARCHAR(24) NOT NULL,
    title VARCHAR(160),
    message VARCHAR(2000) NOT NULL,
    page_url VARCHAR(500),
    rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    status VARCHAR(24) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_feedback_user_created ON user_feedback(user_id, created_at DESC);
CREATE INDEX idx_user_feedback_account_created ON user_feedback(account_id, created_at DESC);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
