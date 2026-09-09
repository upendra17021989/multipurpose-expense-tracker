ALTER TABLE festival_events ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_festival_events_deleted_at ON festival_events(deleted_at);

ALTER TABLE festival_collections DROP CONSTRAINT IF EXISTS festival_collections_festival_event_id_fkey;
ALTER TABLE festival_collections ADD CONSTRAINT festival_collections_festival_event_id_fkey
    FOREIGN KEY (festival_event_id) REFERENCES festival_events(id) ON DELETE CASCADE;

ALTER TABLE festival_collection_receipts DROP CONSTRAINT IF EXISTS festival_collection_receipts_festival_collection_id_fkey;
ALTER TABLE festival_collection_receipts ADD CONSTRAINT festival_collection_receipts_festival_collection_id_fkey
    FOREIGN KEY (festival_collection_id) REFERENCES festival_collections(id) ON DELETE CASCADE;
