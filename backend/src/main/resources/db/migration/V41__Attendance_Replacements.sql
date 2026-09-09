ALTER TABLE society_attendance ADD COLUMN replacement_agency_worker_id BIGINT REFERENCES society_agency_workers(id);
ALTER TABLE society_attendance DROP CONSTRAINT ck_attendance_status;
ALTER TABLE society_attendance ADD CONSTRAINT ck_attendance_status CHECK (status IN ('PRESENT','ABSENT','LATE','HALF_DAY','ON_LEAVE','WEEKLY_OFF','HOLIDAY','REPLACEMENT','NOT_SCHEDULED'));
CREATE INDEX idx_attendance_replacement ON society_attendance(replacement_agency_worker_id);
