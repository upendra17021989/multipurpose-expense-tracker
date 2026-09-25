ALTER TABLE festival_coupon_settings
    ADD COLUMN coupons_per_page INTEGER NOT NULL DEFAULT 6;

ALTER TABLE festival_coupon_settings
    ADD CONSTRAINT chk_festival_coupons_per_page
    CHECK (coupons_per_page BETWEEN 1 AND 12);
