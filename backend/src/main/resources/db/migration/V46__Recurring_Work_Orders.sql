ALTER TABLE society_work_orders ADD COLUMN recurrence_type VARCHAR(20);
ALTER TABLE society_work_orders ADD COLUMN recurrence_interval INTEGER;
ALTER TABLE society_work_orders ADD COLUMN recurrence_end DATE;
ALTER TABLE society_work_orders ADD COLUMN next_occurrence TIMESTAMP;
ALTER TABLE society_work_orders ADD COLUMN recurring_parent_id BIGINT REFERENCES society_work_orders(id);
ALTER TABLE society_work_orders ADD CONSTRAINT ck_work_recurrence_type CHECK(recurrence_type IS NULL OR recurrence_type IN ('DAILY','WEEKLY','MONTHLY'));
ALTER TABLE society_work_orders ADD CONSTRAINT ck_work_recurrence_interval CHECK(recurrence_interval IS NULL OR recurrence_interval > 0);
CREATE INDEX idx_work_orders_next_occurrence ON society_work_orders(account_id,next_occurrence) WHERE next_occurrence IS NOT NULL;

