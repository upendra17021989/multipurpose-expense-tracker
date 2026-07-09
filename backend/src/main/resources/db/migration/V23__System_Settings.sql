CREATE TABLE system_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value VARCHAR(1000) NOT NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings(setting_key, setting_value)
VALUES
    ('site_name', 'Expense Tracker'),
    ('support_email', ''),
    ('maintenance_notice', '');
