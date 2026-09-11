CREATE TABLE festival_other_collections (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    festival_event_id BIGINT NOT NULL REFERENCES festival_events(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL,
    contributor_name VARCHAR(180),
    contact_details VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    transaction_reference VARCHAR(180),
    collected_by VARCHAR(180) NOT NULL,
    description VARCHAR(1000),
    special_mention BOOLEAN NOT NULL DEFAULT FALSE,
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_festival_other_collection_event ON festival_other_collections(account_id, festival_event_id, payment_date);
