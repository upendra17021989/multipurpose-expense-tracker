CREATE TABLE festival_expense_estimates (
    id BIGSERIAL PRIMARY KEY,
    festival_event_id BIGINT NOT NULL REFERENCES festival_events(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    vendor_name VARCHAR(200),
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    remarks VARCHAR(1000)
);
CREATE INDEX idx_festival_estimates_event ON festival_expense_estimates(festival_event_id);
