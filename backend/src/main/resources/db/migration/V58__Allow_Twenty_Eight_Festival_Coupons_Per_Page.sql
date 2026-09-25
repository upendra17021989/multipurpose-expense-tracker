ALTER TABLE festival_coupon_settings
    DROP CONSTRAINT chk_festival_coupons_per_page;

ALTER TABLE festival_coupon_settings
    ADD CONSTRAINT chk_festival_coupons_per_page
    CHECK (coupons_per_page BETWEEN 1 AND 28);
