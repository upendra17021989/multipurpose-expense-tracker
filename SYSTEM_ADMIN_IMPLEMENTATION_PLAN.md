# System Administration Implementation Plan

## Objective

Create a secure, platform-level administration area for operating the entire
expense tracker. Platform administration must remain separate from tenant
account roles such as `OWNER`, `ADMIN`, and `TREASURER`.

Implementation will proceed one phase at a time. Each phase requires explicit
confirmation before work begins, and the completed phase will be tested and
reported before requesting confirmation for the next phase.

## Security principles

- Account-level administrators must never receive platform-level access.
- Every `/api/system-admin/**` endpoint must enforce authorization in the backend.
- Hiding frontend links is not an authorization control.
- Administrative mutations must be validated, confirmed, and audited.
- Sensitive credentials, password hashes, document contents, and secrets must
  never be returned by administration APIs.
- The application must prevent an administrator from accidentally removing the
  final active platform administrator.
- Initial functionality should be read-only wherever possible.

## Proposed navigation

```text
/system-admin
├── Dashboard
├── Users
├── Accounts
├── Storage
├── Audit Logs
├── System Health
├── Backups
└── Settings
```

## Phase 1: Platform-admin identity and route security

### Scope

- Add a dedicated platform-admin attribute to the user model.
- Add a Flyway migration with a secure default of `false`.
- Include platform-admin status in the authenticated user response where needed.
- Add a reusable backend authorization guard.
- Protect `/api/system-admin/**` independently of account roles.
- Add protected frontend routing for `/system-admin`.
- Add the System Admin navigation entry only for authorized users.
- Provide a controlled method for assigning the first platform administrator.

### Security decisions

- Registration must never accept or assign platform-admin status.
- Profile update endpoints must not modify platform-admin status.
- Platform access must be verified against current database state for sensitive
  operations so that revoked access does not remain usable indefinitely.
- The initial administrator should be assigned through a migration or controlled
  environment/configuration process, not a public API.

### Acceptance criteria

- A normal user receives `403 Forbidden` from system-admin APIs.
- An account-level `ADMIN` still receives `403 Forbidden`.
- A platform administrator can open the protected admin shell.
- Direct navigation by an unauthorized user is blocked.
- Authentication and authorization tests pass.

## Phase 2: Read-only admin dashboard

### Scope

- Add system-wide summary endpoints.
- Display total and active users.
- Display account totals grouped by account type.
- Display recent registration counts.
- Display expense and personal-document totals.
- Display shared-document totals without exposing document contents.
- Add a responsive `/system-admin` dashboard.

### Acceptance criteria

- Counts are system-wide and accurate.
- No sensitive user or document data is exposed.
- Dashboard queries are indexed and bounded.
- Mobile and desktop layouts are usable.
- Backend and frontend builds pass.

## Phase 3: User and account management

### Scope

- Search and paginate users.
- View safe user profile information and associated accounts.
- Search and paginate accounts by name, type, owner, and status.
- View account members and roles.
- Activate or suspend users and accounts.
- Revoke active sessions when a user is suspended.
- Add controlled platform-admin grant/revoke operations.

### Safety rules

- Mutations require confirmation.
- The final active platform administrator cannot be removed or suspended.
- Administrators cannot view password hashes or credentials.
- List endpoints must use server-side pagination.

### Acceptance criteria

- Suspended users can no longer authenticate or use existing sessions.
- Account suspension does not delete financial data.
- All mutations are authorized and validated.
- Search and pagination work on mobile and desktop.

## Phase 4: Audit logging

### Scope

- Add an append-only system audit table.
- Record administrator ID, action, target type, target ID, timestamp, IP address,
  outcome, and safe metadata.
- Audit platform-admin changes, user/account suspension, session revocation,
  settings changes, and future backup operations.
- Add a searchable, paginated Audit Logs page.

### Safety rules

- Audit records cannot be edited through application APIs.
- Metadata must not contain passwords, tokens, secrets, or document contents.
- Failed administrative operations should also be recorded when practical.

### Acceptance criteria

- Every supported administrative mutation produces an audit record.
- Audit filters and pagination work.
- Audit records remain after the affected user or account is suspended.

## Phase 5: System health and storage reporting

### Scope

- Add protected health information for the application and database.
- Report application version and active Flyway schema version.
- Report database connectivity and connection-pool health.
- Report configured storage provider connectivity.
- Calculate document storage usage by owner and account.
- Identify missing and orphaned document metadata/files safely.
- Add System Health and Storage pages.

### Safety rules

- Do not expose environment values, JDBC URLs with credentials, stack traces,
  storage keys, or internal secrets.
- Expensive storage scans should run as bounded background jobs.

### Acceptance criteria

- Health status clearly distinguishes healthy, degraded, and unavailable states.
- Storage totals are reproducible.
- No credentials or secrets appear in API responses or logs.

## Phase 6: Backup management

This phase is intentionally deferred until Google Drive credentials and the
deployment environment are ready.

### Scope

- Add manual and scheduled PostgreSQL backups.
- Execute `pg_dump` server-side in PostgreSQL custom format.
- Encrypt backup artifacts before external upload.
- Upload backups to a dedicated Google Drive folder.
- Store backup history, status, size, checksum, and failure reason.
- Implement retention rules.
- Provide protected backup history and manual-run controls.

### Prerequisites

- `pg_dump` installed and version-compatible with the database.
- Google Drive API enabled.
- Service-account credentials stored in a deployment secret.
- Dedicated Drive folder shared with the service account.
- Encryption key stored separately from backup files.

### Safety rules

- Never pass database passwords as visible command-line arguments.
- Never store service-account JSON in Git or `application.properties`.
- Only one backup job may run at a time.
- Generated temporary files must be securely cleaned up.
- A backup is successful only after checksum and upload verification.

### Acceptance criteria

- Manual and scheduled backups complete successfully.
- Failed backups are visible with safe error messages.
- Retention removes only eligible remote backups.
- A documented restore drill verifies that backups are usable.

## Phase 7: Restore tooling and system settings

### Scope

- Add non-secret platform settings with validated changes.
- Provide backup download and restore instructions.
- Add restore verification tooling.
- Consider controlled restore execution only after operational procedures are
  proven.

### Safety rules

- No one-click production restore in the initial release.
- Restore requires a maintenance window, a second confirmation, a pre-restore
  backup, and explicit target-environment verification.
- Restore operations must be fully audited.

### Acceptance criteria

- Settings changes are validated and audited.
- Restore documentation is complete.
- A restore drill succeeds in a non-production environment.

## Testing strategy

Every phase should include:

- Backend unit tests for authorization and service behavior.
- Controller/integration tests for `401`, `403`, validation, and success paths.
- Frontend production build.
- Responsive UI verification.
- Regression checks for normal Individual, Society, Kirana, and Sports accounts.
- Database migration validation against an existing schema.

## Delivery workflow

For each phase:

1. Confirm the phase with the user.
2. Inspect overlapping local changes before editing.
3. Implement only the confirmed phase.
4. Run relevant backend tests and the frontend build.
5. Report files changed, behavior delivered, and any migration/configuration step.
6. Request confirmation before beginning the next phase.

## Current status

| Phase | Status |
|---|---|
| Plan | Completed |
| Phase 1: Identity and security | Implemented |
| Phase 2: Dashboard | Implemented |
| Phase 3: User and account management | Implemented |
| Phase 4: Audit logging | Implemented |
| Phase 5: Health and storage | Implemented |
| Phase 6: Backups | Deferred |
| Phase 7: Restore and settings | Implemented |
