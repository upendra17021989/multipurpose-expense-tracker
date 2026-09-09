CREATE TABLE society_attendance_sheets (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', submitted_by_user_id BIGINT REFERENCES users(id), submitted_at TIMESTAMP,
    locked_by_user_id BIGINT REFERENCES users(id), locked_at TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_attendance_sheet_date UNIQUE(account_id, attendance_date),
    CONSTRAINT ck_attendance_sheet_status CHECK(status IN ('DRAFT','SUBMITTED','LOCKED'))
);
CREATE TABLE society_attendance_corrections (
    id BIGSERIAL PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id), attendance_id BIGINT NOT NULL REFERENCES society_attendance(id),
    requested_by_user_id BIGINT NOT NULL REFERENCES users(id), requested_status VARCHAR(30) NOT NULL,
    requested_check_in TIME, requested_check_out TIME, reason VARCHAR(500) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by_user_id BIGINT REFERENCES users(id), reviewed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_attendance_correction_status CHECK(status IN ('PENDING','APPROVED','REJECTED'))
);
CREATE INDEX idx_attendance_correction_account_status ON society_attendance_corrections(account_id,status);
