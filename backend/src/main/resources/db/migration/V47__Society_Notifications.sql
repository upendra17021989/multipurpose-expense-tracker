CREATE TABLE society_notifications (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), recipient_user_id BIGINT NOT NULL REFERENCES users(id),
    notification_type VARCHAR(40) NOT NULL, entity_type VARCHAR(40) NOT NULL, entity_id BIGINT NOT NULL,
    dedupe_key VARCHAR(160) NOT NULL, title VARCHAR(180) NOT NULL, message VARCHAR(1000) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL', read_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_society_notification_dedupe UNIQUE(account_id,recipient_user_id,dedupe_key)
);
CREATE INDEX idx_society_notifications_inbox ON society_notifications(account_id,recipient_user_id,read_at,created_at);

