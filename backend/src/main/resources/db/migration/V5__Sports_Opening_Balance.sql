ALTER TABLE sports_collections
    ADD COLUMN opening_balance DECIMAL(10,2) DEFAULT 0 NOT NULL,
    ADD COLUMN carried_forward_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

