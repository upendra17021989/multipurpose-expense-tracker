ALTER TABLE users
    ADD COLUMN system_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_users_system_admin_active
    ON users(system_admin, active)
    WHERE system_admin = TRUE;
