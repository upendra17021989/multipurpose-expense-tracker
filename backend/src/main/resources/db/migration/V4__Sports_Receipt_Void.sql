ALTER TABLE sports_collection_receipts
    ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    ADD COLUMN void_reason TEXT,
    ADD COLUMN voided_at TIMESTAMP;

CREATE INDEX idx_sports_collection_receipts_status ON sports_collection_receipts(status);
