ALTER TABLE expenses ADD COLUMN work_order_id BIGINT REFERENCES society_work_orders(id);
CREATE INDEX idx_expenses_work_order ON expenses(account_id,work_order_id) WHERE work_order_id IS NOT NULL AND soft_deleted = FALSE;
