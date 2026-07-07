# Backup and Restore Guide

This app stores important data in two places:

- Supabase Postgres: users, accounts, expenses, budgets, shared expenses, document metadata, etc.
- Supabase Storage bucket: uploaded document files, currently bucket `expensetracker`.

Database backups do not include Storage files, so both must be backed up.

## Recommended schedule

- Daily: Supabase automatic database backup, if available on the current plan.
- Weekly: manual database dump stored outside Supabase.
- Weekly: Storage bucket backup/sync.
- Before every production deployment or Flyway migration: take a fresh database backup.

## 1. Database backup

Use the direct Supabase database connection string when possible. Prefer the direct DB host over the pooler URL for backups.

If `pg_dump` is not working on Windows, first confirm PostgreSQL client tools are installed. `pg_dump` usually lives in a folder like:

```text
C:\Program Files\PostgreSQL\16\bin\pg_dump.exe
```

You can run it with the full path instead of relying on PATH:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" --version
```

If that command fails, install PostgreSQL client tools or use Supabase Dashboard backups.

Example:

```bash
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/postgres" --format=custom --file=backup_YYYYMMDD.dump
```

Plain SQL alternative:

```bash
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/postgres" --file=backup_YYYYMMDD.sql
```

For Windows PowerShell:

```powershell
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/postgres" --format=custom --file="backup_YYYYMMDD.dump"
```

Do not commit backup files to git.

## 2. Database restore

Custom dump restore:

```bash
pg_restore --clean --if-exists --no-owner --dbname "postgresql://USER:PASSWORD@HOST:PORT/postgres" backup_YYYYMMDD.dump
```

Plain SQL restore:

```bash
psql "postgresql://USER:PASSWORD@HOST:PORT/postgres" --file=backup_YYYYMMDD.sql
```

Before restoring production data:

1. Stop the backend service.
2. Take one more backup of the current database.
3. Restore into a test database first if possible.
4. Start backend and verify login, dashboard, expenses, documents, and reports.

## 3. Supabase Storage backup

The document files are stored in Supabase Storage bucket:

```text
expensetracker
```

If using Supabase S3-compatible storage, use an S3 sync tool with these environment values:

```text
SUPABASE_S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
SUPABASE_S3_ACCESS_KEY=<storage-access-key>
SUPABASE_S3_SECRET_KEY=<storage-secret-key>
SUPABASE_S3_REGION=ap-south-1
SUPABASE_STORAGE_BUCKET=expensetracker
```

Example using AWS CLI with endpoint override:

```bash
aws s3 sync s3://expensetracker ./storage-backup/expensetracker \
  --endpoint-url "https://<project-ref>.storage.supabase.co/storage/v1/s3"
```

Restore Storage files:

```bash
aws s3 sync ./storage-backup/expensetracker s3://expensetracker \
  --endpoint-url "https://<project-ref>.storage.supabase.co/storage/v1/s3"
```

Keep Storage backups encrypted if they contain policy, investment, tax, identity, or financial documents.

## 4. Environment variables to back up securely

Store these in a password manager or deployment secrets manager:

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
APP_JWT_SECRET
SUPABASE_S3_ENDPOINT
SUPABASE_S3_ACCESS_KEY
SUPABASE_S3_SECRET_KEY
SUPABASE_S3_REGION
SUPABASE_STORAGE_BUCKET
```

Never commit real secrets to git.

## 5. Deployment safety checklist

Before running production migrations:

1. Take database backup.
2. Confirm Storage backup exists.
3. Deploy backend.
4. Let Flyway migration run.
5. Smoke test:
   - Login
   - Switch account
   - Add expense
   - Upload document
   - View/download document
   - Shared expense group page
6. If anything fails, stop service and restore from backup.

## 6. Local upload cleanup note

Older files may still exist locally under:

```text
backend/uploads
```

Those files are not automatically copied to Supabase Storage. If any old document metadata points to local files, migrate or re-upload those documents before depending only on Supabase Storage backups.
