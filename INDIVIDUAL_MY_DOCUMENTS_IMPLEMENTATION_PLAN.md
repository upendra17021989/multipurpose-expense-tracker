# Individual Module — My Documents Implementation Plan

## Goal

Add a **My Documents** menu and document library to the **Individual** account module. It will let an individual securely upload, organize, view, download, edit, and delete financial or policy documents such as insurance policies, tax records, bank documents, investment statements, loan papers, identity/KYC records, warranties, and other personal financial files.

This document is the implementation plan only. No feature code is included in this phase.

## Scope and assumptions

- The menu is visible only when the active account type is `INDIVIDUAL`.
- Documents belong to the active account, not globally to the user. This preserves isolation when a user can switch between accounts.
- The first version supports PDF and image uploads (`jpg`, `jpeg`, `jfif`, `png`), consistent with the existing attachment service.
- The configured upload size limit remains the source of truth (currently defaulting to 5 MB per file).
- One document record represents one uploaded file in the first version.
- Files remain private and can be read or changed only through authenticated, account-scoped endpoints.
- Expiry dates and policy/financial metadata are optional because many documents do not expire.
- Automatic email/push reminders and OCR extraction are future enhancements, not part of the first release.

## User experience

### Navigation

Add **My Documents** to the Personal/Individual module menu in `Navbar.jsx`, linking to:

```text
/personal/documents
```

The route will be protected by the existing `ProtectedRoute`. The page will also reject use from a non-Individual account through backend authorization rather than relying only on menu visibility.

### Documents page

Create a responsive page with:

- Page title, short description, and **Add document** action.
- Summary cards for total documents, expiring soon, and expired documents.
- Search by title, original filename, issuer/provider, policy/account number, or tags.
- Filters for category, status, and expiry window.
- Sort by newest, oldest, title, or expiry date.
- Desktop table and mobile-friendly cards.
- Clear loading, empty, error, and no-filter-results states.

Each document item will show:

- Title and category.
- Original file name/type.
- Issuer or provider, when supplied.
- Masked policy/account/reference number, when supplied.
- Issue and expiry dates, when supplied.
- Tags and notes indicator.
- Expiry status: `No expiry`, `Active`, `Expiring soon`, or `Expired`.
- Actions: view/download, edit details, and delete.

### Add/edit document form

Use a modal or page form with the following fields:

- `title` — required.
- `category` — required.
- `file` — required on create; not replaced during metadata edit.
- `issuer` — optional.
- `documentNumber` — optional policy/account/reference number.
- `issueDate` — optional.
- `expiryDate` — optional and cannot be before the issue date.
- `tags` — optional.
- `notes` — optional.

Suggested categories:

- Insurance Policy
- Tax Document
- Bank Document
- Investment
- Loan / EMI
- Identity / KYC
- Property
- Warranty / Invoice
- Employment / Income
- Other

The browser will validate required fields and file type/size for fast feedback. The backend will repeat all validation because client-side checks are not a security boundary.

Deletion will require confirmation and will remove both the database metadata and stored file. Download/view will use an authenticated blob request, matching the current API client’s token handling.

## Data model

Create a dedicated `personal_documents` table instead of using a synthetic `referenceId` in the existing `attachments` table. The current attachment model is designed for files attached to another business record; a document library needs first-class searchable metadata.

Proposed columns:

| Column | Type | Rules |
| --- | --- | --- |
| `id` | BIGINT | Primary key, generated |
| `account_id` | BIGINT | Required foreign key to `accounts` |
| `title` | VARCHAR(150) | Required |
| `category` | VARCHAR(40) | Required enum value |
| `issuer` | VARCHAR(150) | Optional |
| `document_number` | VARCHAR(150) | Optional; never written to logs |
| `issue_date` | DATE | Optional |
| `expiry_date` | DATE | Optional |
| `tags` | VARCHAR(500) | Optional normalized comma-separated values for v1 |
| `notes` | VARCHAR(1000) | Optional |
| `original_file_name` | VARCHAR(255) | Required |
| `stored_file_name` | VARCHAR(255) | Required, generated and non-guessable |
| `content_type` | VARCHAR(100) | Required |
| `file_size` | BIGINT | Required |
| `uploaded_by` | BIGINT | Required user identifier |
| `created_at` | TIMESTAMP | Required |
| `updated_at` | TIMESTAMP | Required |

Indexes:

- `(account_id, created_at)` for the default list.
- `(account_id, category)` for category filters.
- `(account_id, expiry_date)` for expiry filters and future reminder jobs.

Add a Flyway migration after the current latest migration (currently `V17`). The exact migration version must be rechecked immediately before implementation to avoid a version collision.

## Backend implementation

### New code

- `PersonalDocument` JPA entity.
- `PersonalDocumentCategory` enum.
- `PersonalDocumentRepository` with account-scoped queries.
- Request/response DTOs for metadata creation, updates, list items, and details.
- `PersonalDocumentService` for validation, storage, querying, update, download, and deletion.
- `PersonalDocumentController` under `/personal/documents`.
- Flyway migration for the new table and indexes.

### Proposed API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/personal/documents` | List/search/filter/sort active account documents |
| `GET` | `/personal/documents/{id}` | Get one document’s metadata |
| `POST` | `/personal/documents` | Multipart upload plus metadata |
| `PUT` | `/personal/documents/{id}` | Update metadata only |
| `GET` | `/personal/documents/{id}/download` | Authenticated inline/download response |
| `DELETE` | `/personal/documents/{id}` | Delete metadata and physical file |
| `GET` | `/personal/documents/summary` | Total/expiring/expired counts |

List parameters will include `query`, `category`, `status`, `sort`, and `direction`. Pagination can be added now (`page`, `size`) to prevent the page degrading as the library grows; the UI can initially use a simple pager.

### Storage and validation

- Reuse the configured upload root but store files in an account-specific document path such as `documents/{accountId}/`.
- Generate stored filenames using UUIDs; never trust the original filename as a disk path.
- Normalize the resolved path and verify it remains under the configured upload root.
- Allowlist extensions and MIME types; do not trust `Content-Type` alone.
- Enforce the configured maximum upload size.
- Sanitize names used in `Content-Disposition`.
- Verify every read, edit, download, and delete query includes the authenticated account ID.
- Verify the active account type is `INDIVIDUAL` in the service/controller authorization path.
- On upload database failure, remove the newly written physical file.
- On delete file failure, log a safe operational warning while keeping behavior deterministic; consider an orphan cleanup job later.

The existing `AttachmentService` remains unchanged for receipts attached to expenses, sales, purchases, and collections. Shared low-level file validation/storage helpers may be extracted only if doing so stays small and does not risk regressions.

## Frontend implementation

### New code

- `frontend/src/pages/personal/MyDocuments.jsx` — list, filters, summary, and actions.
- `frontend/src/components/personal/DocumentForm.jsx` — add/edit form.
- Optional small document-card/status components if the page becomes crowded.
- `personalDocumentAPI` methods in `frontend/src/api/endpoints.js`.

### Existing code changes

- `frontend/src/App.jsx` — import the page and register `/personal/documents` inside `ProtectedRoute`.
- `frontend/src/components/Navbar.jsx` — add **My Documents** only for `INDIVIDUAL` accounts.
- `frontend/src/App.css` or the project’s existing relevant stylesheet — responsive document library styles using current design tokens and patterns.

For downloads, request a blob with the authenticated Axios client, create a temporary object URL, then revoke it after opening/downloading. Do not use a raw `/api/...` browser link because it may omit the bearer token.

## Expiry behavior

- `Expired`: expiry date is before today.
- `Expiring soon`: expiry date is from today through 30 days ahead, inclusive.
- `Active`: expiry date is more than 30 days away.
- `No expiry`: expiry date is absent.

The backend will calculate/filter status using the server date; the UI may calculate labels for display but must not be the authority for filtering. Dates will use ISO `YYYY-MM-DD` values to avoid timezone shifts.

## Testing and verification

### Backend tests

- Upload a valid PDF/image for an Individual account.
- Reject empty, oversized, unsupported, or path-like filenames.
- Reject an expiry date earlier than its issue date.
- List/search/filter/sort only the active account’s documents.
- Prevent a user from reading, updating, downloading, or deleting another account’s document.
- Prevent non-Individual accounts from using these endpoints.
- Update metadata without changing the stored file.
- Delete both the record and physical file.
- Return correct expired/expiring-soon summary counts at boundary dates.

### Frontend verification

- Menu appears for Individual accounts and is absent for Society, Kirana, and Sports.
- Protected route redirects unauthenticated users.
- Add, edit, view/download, filter, sort, and delete flows work.
- Validation and API errors produce useful toast/messages.
- Empty/loading/error states render correctly.
- Layout works on desktop and narrow mobile screens.
- Account switching never displays a previous account’s cached documents.

### Commands

- Run backend tests with `mvn test` from `backend`.
- Run the frontend production build with `npm run build` from `frontend`.
- Perform a manual authenticated smoke test using two different accounts to verify isolation.

## Delivery sequence

1. Add migration, entity, enum, DTOs, and repository.
2. Implement account-scoped service, storage validation, and controller endpoints.
3. Add backend unit/integration tests for validation and authorization boundaries.
4. Add frontend API methods, route, and Individual-only navigation item.
5. Build the responsive My Documents page and add/edit experience.
6. Verify download/delete cleanup and expiry behavior.
7. Run backend tests, frontend build, and multi-account smoke tests.

## Acceptance criteria

- An authenticated Individual account sees **My Documents** in its module menu.
- The user can upload a supported file with a title and category.
- The user can search, filter, sort, view/download, edit metadata, and delete their documents.
- Expired and soon-to-expire documents are clearly identified.
- A document is never accessible from a different account, even when its ID is known.
- Society, Kirana, and Sports accounts cannot access the Individual document APIs.
- Invalid/oversized files are rejected without leaving orphan database records or files.
- Backend tests and the frontend production build pass.

## Explicitly deferred enhancements

- Multiple files/versions under one document record.
- Email, SMS, or push expiry reminders.
- OCR and automatic extraction of policy numbers/dates.
- Cloud object storage and antivirus scanning.
- At-rest field/file encryption beyond the deployment platform’s storage encryption.
- Sharing documents with other users or accounts.
- Archive/restore and document audit history.

