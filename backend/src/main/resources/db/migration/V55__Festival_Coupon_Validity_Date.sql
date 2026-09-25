ALTER TABLE festival_coupon_settings ADD COLUMN valid_on DATE;

UPDATE festival_coupon_settings settings
SET valid_on = events.start_date
FROM festival_events events
WHERE events.id = settings.festival_event_id
  AND settings.valid_on IS NULL;

ALTER TABLE festival_coupon_settings ALTER COLUMN valid_on SET NOT NULL;
