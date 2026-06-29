ALTER TABLE sports_events
    ADD COLUMN owner_user_id BIGINT;

ALTER TABLE sports_events
    ADD CONSTRAINT fk_sports_events_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id);

CREATE INDEX idx_sports_events_owner_user_id ON sports_events(owner_user_id);
