ALTER TABLE account_user_memberships
    ADD COLUMN requested_block_name VARCHAR(100),
    ADD COLUMN requested_flat_number VARCHAR(100),
    ADD COLUMN requested_relation VARCHAR(100);
