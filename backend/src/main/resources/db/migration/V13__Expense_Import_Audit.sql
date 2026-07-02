ALTER TABLE expenses
    ADD COLUMN source_reference VARCHAR(255),
    ADD COLUMN import_batch_id VARCHAR(36);

CREATE UNIQUE INDEX uq_expenses_account_source_reference
    ON expenses(account_id, source_reference)
    WHERE source_reference IS NOT NULL AND soft_deleted = FALSE;

CREATE INDEX idx_expenses_import_batch_id ON expenses(import_batch_id);
