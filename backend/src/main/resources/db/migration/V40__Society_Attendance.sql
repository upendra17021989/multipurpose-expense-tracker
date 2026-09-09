CREATE TABLE society_attendance (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    roster_assignment_id BIGINT NOT NULL REFERENCES society_roster_assignments(id),
    attendance_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    check_in TIME,
    check_out TIME,
    notes VARCHAR(500),
    recorded_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_attendance_roster_date UNIQUE (roster_assignment_id, attendance_date),
    CONSTRAINT ck_attendance_status CHECK (status IN ('PRESENT','ABSENT','LATE','HALF_DAY','ON_LEAVE','WEEKLY_OFF','HOLIDAY','NOT_SCHEDULED'))
);
CREATE INDEX idx_attendance_account_date ON society_attendance(account_id, attendance_date);
