CREATE TABLE festival_coupon_settings (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    festival_event_id BIGINT NOT NULL REFERENCES festival_events(id) ON DELETE CASCADE,
    coupon_name VARCHAR(120) NOT NULL,
    default_coupon_count INTEGER NOT NULL,
    generation_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_festival_coupon_settings_event UNIQUE (festival_event_id),
    CONSTRAINT chk_festival_coupon_default_count CHECK (default_coupon_count BETWEEN 1 AND 100)
);

CREATE TABLE festival_coupon_entitlements (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    festival_event_id BIGINT NOT NULL REFERENCES festival_events(id) ON DELETE CASCADE,
    festival_collection_id BIGINT NOT NULL REFERENCES festival_collections(id) ON DELETE CASCADE,
    coupon_count_override INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_festival_coupon_entitlement_collection UNIQUE (festival_collection_id),
    CONSTRAINT chk_festival_coupon_override CHECK (coupon_count_override IS NULL OR coupon_count_override BETWEEN 0 AND 100)
);

CREATE TABLE festival_coupons (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    festival_event_id BIGINT NOT NULL REFERENCES festival_events(id) ON DELETE CASCADE,
    festival_collection_id BIGINT NOT NULL REFERENCES festival_collections(id) ON DELETE CASCADE,
    flat_id BIGINT NOT NULL REFERENCES flats(id),
    coupon_number VARCHAR(100) NOT NULL,
    sequence_number INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    generated_by BIGINT NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    CONSTRAINT uq_festival_coupon_number UNIQUE (coupon_number),
    CONSTRAINT uq_festival_coupon_sequence UNIQUE (festival_event_id, flat_id, sequence_number),
    CONSTRAINT chk_festival_coupon_sequence CHECK (sequence_number > 0)
);

CREATE INDEX idx_festival_coupon_settings_account_event ON festival_coupon_settings(account_id, festival_event_id);
CREATE INDEX idx_festival_coupon_entitlements_event ON festival_coupon_entitlements(account_id, festival_event_id);
CREATE INDEX idx_festival_coupons_event_status ON festival_coupons(account_id, festival_event_id, status);
CREATE INDEX idx_festival_coupons_collection ON festival_coupons(festival_collection_id);
