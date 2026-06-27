ALTER TABLE sports_collections
    ADD COLUMN opening_due DECIMAL(10,2) DEFAULT 0 NOT NULL,
    ADD COLUMN carried_forward_pending_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

