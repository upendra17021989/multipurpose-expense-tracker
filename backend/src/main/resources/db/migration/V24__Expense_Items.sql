CREATE TABLE expense_items (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    amount DECIMAL(19,2) NOT NULL CHECK (amount > 0),
    display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_expense_items_expense ON expense_items(expense_id);

CREATE TABLE shared_expense_items (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES shared_expenses(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    amount DECIMAL(19,2) NOT NULL CHECK (amount > 0),
    display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_shared_expense_items_expense ON shared_expense_items(expense_id);
