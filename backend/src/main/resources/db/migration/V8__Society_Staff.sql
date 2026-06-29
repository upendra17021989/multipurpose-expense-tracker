CREATE TABLE society_staff (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    staff_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    mobile VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    joining_date DATE,
    monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_society_staff_account FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_society_staff_account_id ON society_staff(account_id);
