CREATE INDEX IF NOT EXISTS idx_expenses_account_festival_active
    ON expenses (account_id, festival_event_id)
    WHERE soft_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_festival_collections_account_event
    ON festival_collections (account_id, festival_event_id);

CREATE INDEX IF NOT EXISTS idx_festival_receipts_collection_date
    ON festival_collection_receipts (festival_collection_id, payment_date DESC);
