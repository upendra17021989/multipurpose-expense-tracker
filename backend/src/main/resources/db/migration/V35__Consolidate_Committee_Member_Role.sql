UPDATE account_user_memberships
SET role = 'BLOCK_REPRESENTATIVE',
    updated_at = CURRENT_TIMESTAMP
WHERE role = 'COMMITTEE_MEMBER';
