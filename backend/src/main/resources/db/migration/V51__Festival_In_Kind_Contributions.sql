ALTER TABLE festival_other_collections
    ADD COLUMN contribution_kind VARCHAR(20) NOT NULL DEFAULT 'MONETARY',
    ADD COLUMN item_name VARCHAR(180),
    ADD COLUMN quantity VARCHAR(100),
    ALTER COLUMN amount DROP NOT NULL,
    ALTER COLUMN payment_mode DROP NOT NULL;

ALTER TABLE festival_other_collections
    ADD CONSTRAINT chk_festival_contribution_kind
        CHECK (contribution_kind IN ('MONETARY', 'IN_KIND', 'SERVICE'));
