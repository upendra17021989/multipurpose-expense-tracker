ALTER TABLE shared_group_invitations
    ADD COLUMN member_id BIGINT REFERENCES shared_group_members(id);

CREATE UNIQUE INDEX uq_shared_invitation_member
    ON shared_group_invitations(member_id)
    WHERE member_id IS NOT NULL AND status = 'PENDING';

INSERT INTO shared_group_invitations
    (group_id, invited_by_user_id, invited_user_id, member_id, email, mobile, status, created_at, expires_at)
SELECT m.group_id,
       g.created_by,
       u.id,
       m.id,
       m.email,
       m.mobile,
       'PENDING',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP + INTERVAL '30 days'
FROM shared_group_members m
JOIN shared_expense_groups g ON g.id = m.group_id
LEFT JOIN users u ON u.mobile = m.mobile
WHERE m.user_id IS NULL
  AND m.mobile IS NOT NULL
  AND TRIM(m.mobile) <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM shared_group_invitations i
      WHERE i.group_id = m.group_id
        AND i.mobile = m.mobile
        AND i.status = 'PENDING'
  );

UPDATE shared_group_invitations i
SET member_id = m.id
FROM shared_group_members m
WHERE i.member_id IS NULL
  AND i.status = 'PENDING'
  AND m.group_id = i.group_id
  AND m.user_id IS NULL
  AND m.mobile = i.mobile;
