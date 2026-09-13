-- Keep the latest revision from legacy data, then enforce one report per society/date.
DELETE FROM society_daily_reports older
USING society_daily_reports newer
WHERE older.account_id = newer.account_id
  AND older.report_date = newer.report_date
  AND (older.revision < newer.revision OR (older.revision = newer.revision AND older.id < newer.id));

ALTER TABLE society_daily_reports
    DROP CONSTRAINT society_daily_reports_account_id_report_date_revision_key;

ALTER TABLE society_daily_reports
    ADD CONSTRAINT uk_society_daily_report_account_date UNIQUE (account_id, report_date);
