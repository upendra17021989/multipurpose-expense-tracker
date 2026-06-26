CREATE TABLE account_user_memberships (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(account_id, user_id)
);

CREATE INDEX idx_account_user_memberships_account_id ON account_user_memberships(account_id);
CREATE INDEX idx_account_user_memberships_user_id ON account_user_memberships(user_id);
