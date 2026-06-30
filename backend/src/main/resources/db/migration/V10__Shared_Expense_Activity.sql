CREATE TABLE shared_expense_activities (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES shared_expense_groups(id),
    actor_user_id BIGINT NOT NULL REFERENCES users(id),
    activity_type VARCHAR(40) NOT NULL,
    reference_type VARCHAR(30),
    reference_id BIGINT,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_shared_activity_group_created ON shared_expense_activities(group_id, created_at DESC);
