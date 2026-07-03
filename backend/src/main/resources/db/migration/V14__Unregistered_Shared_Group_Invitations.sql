ALTER TABLE shared_group_invitations
    ADD COLUMN expires_at TIMESTAMP;

UPDATE shared_group_invitations
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

ALTER TABLE shared_group_invitations
    ALTER COLUMN expires_at SET NOT NULL,
    ALTER COLUMN expires_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

CREATE UNIQUE INDEX uq_shared_pending_invitation_mobile
    ON shared_group_invitations(group_id, mobile)
    WHERE status = 'PENDING' AND mobile IS NOT NULL;

CREATE INDEX idx_shared_invitation_mobile_status
    ON shared_group_invitations(mobile, status);
