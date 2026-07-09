# Database Restore and Verification Runbook

## Status

Database backup automation is deferred. This runbook defines the safe process
for verifying and restoring a PostgreSQL custom-format backup once backups are
available.

The application intentionally does not provide a one-click restore action.

## Mandatory safeguards

- Never perform the first restore test against production.
- Use a PostgreSQL client version compatible with the database server.
- Verify the target host and database name before every command.
- Store credentials in the environment or a secret manager, not command history.
- Put the application into a maintenance window before a production restore.
- Create and verify a fresh pre-restore backup.
- Record the operator, backup checksum, target, start time, and outcome.
- Keep the source backup immutable throughout verification.

## Required tools

- `pg_restore`
- `psql`
- SHA-256 checksum tool
- A disposable PostgreSQL database or isolated restore environment

## 1. Inspect the backup

Calculate and record its checksum:

```powershell
Get-FileHash .\expense-tracker.backup -Algorithm SHA256
```

Confirm that PostgreSQL can read the archive:

```powershell
pg_restore --list .\expense-tracker.backup
```

Stop if either command fails.

## 2. Prepare an isolated target

Create a new, empty database whose name clearly identifies it as a restore test.
Do not reuse a development or production database.

Example:

```powershell
createdb --host $env:RESTORE_DB_HOST --port $env:RESTORE_DB_PORT --username $env:RESTORE_DB_USER expense_tracker_restore_test
```

Use `PGPASSWORD` only in the protected process environment when password
authentication is required. Do not place passwords directly in commands.

## 3. Restore

For a PostgreSQL custom-format archive:

```powershell
pg_restore --host $env:RESTORE_DB_HOST --port $env:RESTORE_DB_PORT --username $env:RESTORE_DB_USER --dbname expense_tracker_restore_test --no-owner --no-privileges --exit-on-error .\expense-tracker.backup
```

Do not use `--clean` against an environment that contains data.

## 4. Verify database integrity

Connect with `psql` and verify:

- Flyway schema history exists and its latest migration is successful.
- Required tables exist.
- User and account counts are plausible.
- Expense and document metadata counts are plausible.
- Foreign-key constraints are valid.
- No unexpected invalid indexes exist.

Example read-only checks:

```sql
SELECT version, success
FROM flyway_schema_history
ORDER BY installed_rank DESC
LIMIT 5;

SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM accounts;
SELECT COUNT(*) FROM expenses WHERE soft_deleted = FALSE;
SELECT COUNT(*) FROM personal_documents;
SELECT COUNT(*) FROM system_admin_audit_logs;
```

## 5. Verify the application

Start a temporary backend instance pointed at the restored database using
isolated credentials and storage configuration.

Verify:

- Application startup and Flyway validation succeed.
- A normal user can authenticate.
- Account switching works.
- Core expense queries work.
- System Admin dashboard and health endpoints work.
- Document metadata loads.

Do not test document deletion or upload against production storage.

## 6. Record the drill

Record:

- Backup filename and SHA-256 checksum
- Backup creation time
- Restore target
- PostgreSQL client/server versions
- Restore duration
- Verification counts
- Application smoke-test result
- Operator
- Any errors or warnings

The backup is considered usable only after this drill succeeds.

## Production restore decision

A production restore requires:

1. Confirmed incident and approved maintenance window.
2. A fresh pre-restore backup.
3. Two-person verification of target and selected backup.
4. Successful prior restore drill for the selected backup or equivalent backup set.
5. Application traffic stopped.
6. Post-restore integrity checks and smoke tests.
7. Audit and incident records.

If any prerequisite is missing, stop and restore to an isolated environment
instead.

