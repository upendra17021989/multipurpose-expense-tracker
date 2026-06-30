# Shared Expenses Development Roadmap

## Goal

Extend the existing `INDIVIDUAL` account into a Splitwise-style shared-expense module without changing or removing the current personal expense, category, budget, and report workflows.

## Design principles

- Shared expenses use separate tables from `expenses`.
- Every request is scoped to the authenticated `accountId` and `userId`.
- Money uses Java `BigDecimal` and PostgreSQL `DECIMAL(19,2)`.
- Payer totals and share totals must exactly equal the expense total.
- Financial records are reversed or archived rather than silently destroyed.
- Balance calculations are covered by unit/integration tests before advanced UI work.

## Phase 1 — Shared expense MVP

Status: **Complete** — schema, account-scoped APIs, group/member lifecycle, equal/exact expenses, balances, settlements, reversal support, Personal-module screens, and split/rounding tests are implemented.

### Scope

- Create and archive expense groups.
- Add, edit, and deactivate account-local group members.
- Automatically include the current user as the group owner.
- Add group expenses with one payer.
- Support `EQUAL` and `EXACT` split methods.
- Display expense history and per-member net balances.
- Record full or partial settlements.
- Add Personal-module navigation and dashboard access.

### Backend deliverables

- Flyway migration `V9__Shared_Expenses.sql`.
- Entities: `SharedExpenseGroup`, `SharedGroupMember`, `SharedExpense`, `SharedExpensePayer`, `SharedExpenseShare`, and `SharedSettlement`.
- DTOs for group, member, expense, balance, and settlement operations.
- Repositories with account-scoped lookups.
- Transactional `SharedExpenseService`.
- REST endpoints under `/personal/shared-expenses`.
- Validation for account type, membership, positive amounts, payer totals, share totals, and settlement parties.
- Tests for equal splits, exact splits, rounding, multiple expenses, and partial settlements.

### API shape

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/personal/shared-expenses/groups` | List groups with summary balances |
| `POST` | `/personal/shared-expenses/groups` | Create a group |
| `GET` | `/personal/shared-expenses/groups/{groupId}` | Group, members, expenses, and balances |
| `PUT` | `/personal/shared-expenses/groups/{groupId}` | Rename/archive a group |
| `POST` | `/personal/shared-expenses/groups/{groupId}/members` | Add a member |
| `PUT` | `/personal/shared-expenses/groups/{groupId}/members/{memberId}` | Edit/deactivate a member |
| `POST` | `/personal/shared-expenses/groups/{groupId}/expenses` | Add an expense |
| `PUT` | `/personal/shared-expenses/expenses/{expenseId}` | Edit an expense and replace its split rows |
| `DELETE` | `/personal/shared-expenses/expenses/{expenseId}` | Reverse an expense |
| `GET` | `/personal/shared-expenses/groups/{groupId}/balances` | Calculate member balances |
| `POST` | `/personal/shared-expenses/groups/{groupId}/settlements` | Record a settlement |

### Balance rule

For each member:

```text
net = expense payments - expense shares + settlements paid - settlements received
```

A positive net means the member should receive money. A negative net means the member owes money. The sum of all member balances must always be zero.

### Acceptance criteria

- An Individual-account user can create a group and add at least two members.
- An expense can be split equally, including deterministic paise rounding.
- An expense can be split using exact amounts.
- Invalid payer/share totals are rejected by the server.
- Group balances sum to zero.
- A partial settlement correctly changes both parties' balances.
- Users cannot access groups belonging to another account.
- Existing personal expenses and budgets continue to work unchanged.

## Phase 2 — Collaboration and audit history

Status: **In progress** — immutable activity storage and backend multiple-payer support have been started; UI controls, broader audit coverage, invitations, and notifications remain.

- Link members to registered users by invitation.
- Friend/contact list and non-group expenses.
- Multiple payers for one expense.
- Expense comments and receipt attachments.
- Immutable activity/audit log.
- In-app notifications for invitations and financial changes.
- Settlement reversal and proof attachment.

## Phase 3 — Advanced splitting and recurring expenses

Status: **Not started**

- Percentage and weighted-share splits.
- Itemized bill splitting.
- Recurring shared expenses.
- Debt simplification suggestions.
- Reminders for outstanding balances.
- Group categories and richer filtering.

## Phase 4 — Multi-currency, analytics, and offline use

Status: **Not started**

- Per-group base currency and stored exchange rates.
- Multi-currency balances and settlement reporting.
- Shared-expense Excel/PDF export.
- Spending analytics by member, category, and group.
- PWA/offline draft entry and later synchronization.

## Phase completion workflow

For each phase:

1. Confirm schema and API contracts.
2. Add the Flyway migration and backend domain model.
3. Implement validation and automated tests.
4. Add frontend API calls, routes, and screens.
5. Run backend tests and the frontend production build.
6. Update this document with completion status, decisions, and deferred items.

## Out of scope for the initial MVP

- Real-money transfers or payment-gateway integration.
- Automatic bank/UPI reconciliation.
- Currency conversion using live exchange-rate services.
- Deleting financial history without an audit trail.
