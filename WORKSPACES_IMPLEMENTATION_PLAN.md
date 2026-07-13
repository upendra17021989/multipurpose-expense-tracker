# Workspaces Implementation Plan

## Goal

Move the product to a one-user, many-workspaces model. A registered user should not create a second login for another product area. They should log in once, then optionally create, join, or switch workspaces from a logged-in menu.

## Product Language

Use **Workspace** in the UI.

Use existing backend terms where they already exist:

- `Account` remains the persistence model for a workspace.
- `AccountType` remains the workspace type enum.
- `AccountUserMembership` remains the membership/role relationship for joined workspaces.

## User Experience

1. Public registration is only for new users.
2. If mobile or email already exists, registration is blocked with a message directing the user to log in and use Workspaces.
3. Login opens the user's normal/default/current dashboard.
4. Workspaces are available from the account/profile menu, not as a forced panel after login.
5. The Workspaces page lets a user:
   - See all accessible workspaces.
   - Switch the current workspace.
   - Create a new workspace for Personal, Society, Sports, or Kirana.
   - Request to join an existing Society workspace.
6. The app remembers the selected workspace through the existing session/current account behavior.

## Backend Plan

### Phase 1: Safe Foundation

- Change `/auth/register` so it rejects an existing mobile/email instead of adding another account to the existing user.
- Add a logged-in endpoint:
  - `POST /auth/workspaces`
  - Accepts a workspace creation/join payload based on the existing `RegisterRequest` fields.
  - Uses the authenticated user, not public registration credentials.
  - Returns an updated `LoginResponse` so the frontend can refresh token/accounts/current workspace.

### Phase 2: Workspace Management API

- Add `GET /auth/workspaces` if the frontend later needs refresh without switching.
- Add optional endpoints for pending requests and membership status.
- Add server-side checks for duplicate workspace creation where appropriate.

### Phase 3: Membership Flows

- Society join requests continue to create inactive `AccountUserMembership` rows.
- Sports and Kirana can start as owner-created workspaces.
- Future enhancements can allow invited staff/member joins by invite code or admin approval.

## Frontend Plan

### Phase 1: Menu Entry and Page

- Add `Workspaces` to the logged-in account menu.
- Add `/workspaces` route protected by auth.
- Build a Workspaces page with:
  - Existing workspace list.
  - Switch buttons.
  - Create workspace form.
  - Society join option.

### Phase 2: Polish

- Add helpful empty/pending states.
- Add role/status labels.
- Add translations for common labels.
- Improve mobile layout if needed.

## Validation Rules

Public registration:

- Existing mobile: block.
- Existing email: block.
- Message should tell the user to log in and add/join a workspace.

Logged-in workspace creation:

- `accountType` required.
- `accountName` required for Personal, Sports, and Kirana unless derived from type-specific fields.
- `societyName` required when creating a Society workspace.
- `societyId` required when joining an existing Society.
- New workspace owner role comes from existing role rules.

## Rollout Plan

1. Implement duplicate registration blocking.
2. Implement logged-in workspace creation endpoint.
3. Implement Workspaces page and menu link.
4. Run backend tests and frontend build.
5. Later: add richer join/invite flows for non-Society workspace types.

## Acceptance Criteria

- A user cannot register again with an existing mobile or email.
- A logged-in user can open Workspaces from the account menu.
- A logged-in user can switch between existing workspaces.
- A logged-in user can create another workspace without creating another user login.
- A logged-in user is not forced to see the Workspaces page after every login.

