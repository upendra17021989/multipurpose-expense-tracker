ALTER TABLE expense_items ADD COLUMN quantity DECIMAL(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0);
ALTER TABLE expense_items ADD COLUMN unit_price DECIMAL(19,2);
ALTER TABLE shared_expense_items ADD COLUMN quantity DECIMAL(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0);
ALTER TABLE shared_expense_items ADD COLUMN unit_price DECIMAL(19,2);
