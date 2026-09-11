# Society Staff Access and Daily Operations Implementation Plan

## 1. Purpose

This document defines how society employees and agency workers should securely access and operate the Society module without being treated as residents or society members.

The first supported operational role will be **Society Supervisor**. A supervisor should be able to manage the society's everyday functioning, coordinate direct and outsourced staff, record attendance, handle work and complaints, track vendors, and provide an auditable daily record to the society administration.

This plan separates four concepts that must not be mixed:

1. **Society member**: Owner, tenant, resident, or committee member associated with a flat.
2. **Staff record**: Employment or contractor record containing designation, contact details, joining date, agency, and compensation information.
3. **System access**: A user account's permission to access a particular society workspace.
4. **Operational activity**: Work, attendance, inspections, incidents, and updates performed by a person.

## 2. Current State and Problem

The application currently supports:

- Society workspaces.
- Society member join requests and membership roles.
- Staff records with name, designation, contact details, joining date, address, and salary.
- A `SUPERVISOR` membership access role.

The current gap is that a `SocietyStaff` record is not connected to a login. To access the workspace, a supervisor has to join as a society member, which incorrectly places an employee in the resident/member directory.

There is also no complete operational trail for:

- Daily work performed by the supervisor.
- Attendance of guards, cleaners, gardeners, and other workers.
- Attendance supplied by external agencies.
- Assignment and completion of society work.
- Before/after evidence and administrative verification.
- Incidents, handovers, inspections, and daily summaries.

## 3. Goals

### 3.1 Primary goals

- Give staff secure access to a society workspace without making them society members.
- Allow an administrator to invite, activate, suspend, or revoke staff access.
- Let supervisors handle routine society operations from one dashboard.
- Record attendance for direct staff and agency-provided workers.
- Track who performed every important operation.
- Provide admins with daily and monthly reports.
- Apply least-privilege access to financial and resident information.

### 3.2 Non-goals for the first release

- Biometric hardware integration.
- GPS tracking throughout an employee's shift.
- Full HR, statutory compliance, tax, or salary-processing software.
- Automatic payment to agencies or employees.
- Public access for unauthenticated workers.

These can be introduced after the core access, operations, and attendance flows are stable.

## 4. Users and Responsibilities

### 4.1 Society Admin

- Creates and manages staff and agency records.
- Grants, changes, suspends, and revokes workspace access.
- Defines shifts and attendance policies.
- Views all operational reports and audit records.
- Approves sensitive expenses and verifies completed work.
- Configures which permissions a supervisor receives.

### 4.2 Society Supervisor

- Runs the society's everyday operations.
- Records or verifies staff attendance.
- Assigns and monitors work.
- Coordinates security, cleaning, gardening, maintenance, and agencies.
- Updates complaints and incidents.
- Records inspections and shift handovers.
- Uploads supporting photographs and documents.
- Submits a daily operations summary.

### 4.3 Direct Staff

Examples: security guard, cleaner, gardener, electrician, plumber, and office assistant.

- May initially have no application login.
- Is represented by a staff record and shift assignment.
- Has attendance recorded by a supervisor or admin.
- Can receive limited self-service access in a later phase.

### 4.4 Agency Worker

- Works at the society through a cleaning, security, housekeeping, or maintenance agency.
- Is linked to both an agency and a worker record.
- Can be assigned to a post or shift.
- May be replaced by another agency worker while preserving attendance history.

### 4.5 Treasurer or Committee Viewer

- Views operational summaries and permitted expenses.
- Cannot alter attendance or staff access unless explicitly authorized.
- May verify costs or reports according to assigned permissions.

## 5. Access Model

### 5.1 Recommended model

Create a separate staff access association:

```text
User
  └── SocietyStaffAccess
        ├── societyAccountId
        ├── staffId
        ├── accessRole
        ├── status
        ├── invitedByUserId
        ├── invitedAt
        ├── acceptedAt
        ├── suspendedAt
        └── revokedAt
```

`SocietyStaffAccess` should determine login access. `SocietyStaff` should continue to contain employment data. `AccountUserMembership` should remain reserved for owners, tenants, residents, and committee members.

### 5.2 Access statuses

- `INVITED`
- `ACTIVE`
- `SUSPENDED`
- `REVOKED`
- `EXPIRED`

### 5.3 Staff access roles

- `STAFF_SUPERVISOR`
- `STAFF_ACCOUNTANT` (future)
- `STAFF_SECURITY` (future limited self-service)
- `STAFF_MAINTENANCE` (future limited self-service)
- `STAFF_VIEWER` (optional)

Do not reuse a resident/member role for staff. During migration, the existing society `SUPERVISOR` role can temporarily map to `STAFF_SUPERVISOR`, but all new staff access should use the separate model.

### 5.4 Permission matrix

| Capability | Admin | Supervisor | Treasurer | Member |
|---|---:|---:|---:|---:|
| Manage staff master records | Yes | View, limited update | View | No |
| Grant or revoke staff login access | Yes | No | No | No |
| Manage agencies and contracts | Yes | Operational update | View | No |
| Define shifts and attendance rules | Yes | No | View | No |
| Record daily attendance | Yes | Yes | View | No |
| Correct approved/locked attendance | Yes | Request correction | No | No |
| Create and assign work orders | Yes | Yes | View | No |
| Update work status and evidence | Yes | Yes | View | No |
| Verify completed work | Yes | No | Optional | No |
| Record incidents and inspections | Yes | Yes | View | No |
| Handle resident complaints | Yes | Yes | View | Own complaint only |
| Create operational expense request | Yes | Yes | Review | No |
| Approve or pay expenses | Yes/configurable | No | Configurable | No |
| View sensitive bank/account settings | Yes | No | Configurable | No |
| View audit log | Yes | Own actions and operational timeline | View | No |
| Export operational reports | Yes | Configurable | Yes | No |

Permissions should be enforced by the backend. Hiding a button in the frontend is not sufficient authorization.

## 6. Staff Onboarding and Access Workflow

### 6.1 Admin creates the staff record

Path: **Society workspace > Community > Staff > Add Staff**

Required data:

- Full name.
- Designation.
- Employment type: `DIRECT`, `AGENCY`, or `CONTRACT`.
- Mobile number and/or email.
- Joining date.
- Active status.
- Agency, when employment type is `AGENCY`.
- Default shift or post, when applicable.

Optional data:

- Address.
- Emergency contact.
- Employee/agency worker code.
- Identity-document reference and expiry date.
- Salary or contracted monthly rate.
- Profile photograph.

### 6.2 Admin grants access

From the staff details page, the admin selects **Grant workspace access**, chooses `Staff Supervisor`, reviews permissions, and sends an invitation.

Invitation options:

- Email link.
- Mobile OTP/link when an SMS provider is available.
- A time-limited invitation code shown to the admin as a fallback.

The invitation should expire after a configurable period, recommended seven days. Resending an invitation invalidates the previous token.

### 6.3 Staff accepts access

- An existing user signs in and accepts the invitation.
- A new user creates an account, verifies their contact method, and accepts it.
- The backend confirms that the invitation contact matches the verified user contact or asks the admin to approve a mismatch.
- The society workspace appears under the user's workspaces with the label `Staff - Supervisor`.

No flat, block, resident relation, or membership approval should be required.

### 6.4 Suspension and offboarding

- Suspension immediately prevents access but retains history.
- Revocation terminates the access association without deleting activities.
- Deactivating a staff record should suspend active access automatically after confirmation.
- Work still assigned to an offboarded supervisor must be reassigned.
- Audit and attendance records must retain the staff name snapshot even if personal details later change.

## 7. Supervisor Operations Dashboard

The supervisor landing page should prioritize today's work.

### 7.1 Dashboard cards

- Staff expected today.
- Present, absent, late, and on-leave counts.
- Agency staffing shortages.
- Open and overdue work orders.
- Unresolved resident complaints.
- Scheduled vendor visits.
- Open incidents.
- Inspections due today.
- Daily report status: not started, draft, or submitted.

### 7.2 Quick actions

- Take attendance.
- Create work order.
- Record incident.
- Add inspection.
- Update complaint.
- Record vendor visit.
- Add operational expense request.
- Submit daily report.

### 7.3 Daily checklist

Configurable checklist examples:

- Verify security shift handover.
- Check housekeeping attendance.
- Inspect common-area cleanliness.
- Check water pumps and tank levels.
- Check lifts and generator status.
- Review unresolved complaints.
- Confirm scheduled vendor work.
- Inspect waste collection.
- Check common-area lighting.
- Submit closing summary.

Each checklist item should record completion time, person, notes, and optional evidence.

## 8. Attendance Management

### 8.1 Attendance scope

Support attendance for:

- Direct society employees.
- Permanent agency workers.
- Temporary/replacement agency workers.
- Multiple shifts in one day.
- Workers assigned to specific gates, blocks, zones, or duties.

### 8.2 Core attendance fields

- Society.
- Staff or agency worker.
- Attendance date.
- Scheduled shift.
- Actual check-in and check-out.
- Attendance status.
- Assigned post/location.
- Recorded by.
- Recording method.
- Notes.
- Late minutes and overtime minutes.
- Replacement worker reference.
- Evidence attachment, when required.
- Approval/lock status.
- Created and updated timestamps.

Attendance statuses:

- `PRESENT`
- `ABSENT`
- `LATE`
- `HALF_DAY`
- `ON_LEAVE`
- `WEEKLY_OFF`
- `HOLIDAY`
- `REPLACEMENT`
- `NOT_SCHEDULED`

Recording methods:

- `SUPERVISOR_ENTRY`
- `ADMIN_ENTRY`
- `STAFF_SELF_SERVICE` (future)
- `QR`
- `BIOMETRIC_IMPORT`
- `BULK_IMPORT`

### 8.3 Daily attendance workflow

1. The system generates the expected roster from shift assignments.
2. The supervisor opens **Today's Attendance**.
3. Workers are grouped by agency, department, and shift.
4. The supervisor marks present/absent/late or records check-in.
5. A replacement worker can be selected or quickly created for an absent agency worker.
6. The supervisor records check-out at the end of the shift.
7. The supervisor reviews shortages and submits the attendance sheet.
8. Submitted attendance becomes locked after a configurable cutoff.
9. Later changes require a correction reason and admin approval.

### 8.4 Agency attendance

Create an `Agency` master with:

- Name, service category, contact person, phone, and email.
- Contract dates.
- Required headcount by shift/post.
- Billing model and rate, where needed.
- Compliance document references and expiry dates.
- Active status.

The attendance screen should compare required versus actual headcount:

| Agency | Shift | Required | Present | Replacement | Shortage |
|---|---|---:|---:|---:|---:|
| Secure Services | Night | 4 | 3 | 0 | 1 |
| CleanHome Agency | Morning | 6 | 5 | 1 | 0 |

Shortages should create an alert and optionally notify the admin and agency contact. Agency workers must have stable worker records whenever possible so attendance history is not lost when names are entered differently.

### 8.5 Attendance controls

- Prevent duplicate attendance for the same worker and shift.
- Warn about overlapping shifts.
- Require a reason for manual time changes.
- Do not allow a supervisor to silently delete attendance.
- Retain old and new values in the audit log.
- Allow admins to lock a completed month.
- Treat biometric/QR data as evidence, not as authorization by itself.
- Store timestamps in UTC and display them in the society's configured timezone.

### 8.6 Attendance reports

- Daily muster roll.
- Monthly attendance register.
- Employee-wise attendance.
- Agency-wise staffing compliance.
- Shift/post shortages.
- Late arrivals and early departures.
- Overtime summary.
- Replacement-worker history.
- Corrections and exceptions report.
- Export to CSV/PDF in a later reporting increment.

## 9. Work Order Management

### 9.1 Work order fields

- Work order number.
- Title and description.
- Category: electrical, plumbing, lift, cleaning, security, civil, gardening, fire safety, or other.
- Source: supervisor, admin, resident complaint, inspection, preventive schedule, or incident.
- Location: society, block, flat, gate, facility, or custom location.
- Priority: low, normal, high, emergency.
- Assigned supervisor, staff, agency, or vendor.
- Planned start and due date.
- Actual start and completion time.
- Status.
- Checklist.
- Material and labour details.
- Estimated and actual cost.
- Attachments and before/after photos.
- Completion notes.
- Verification status and verifier.

Statuses:

- `OPEN`
- `ASSIGNED`
- `IN_PROGRESS`
- `BLOCKED`
- `COMPLETED`
- `VERIFIED`
- `CANCELLED`

### 9.2 Work order workflow

1. Admin or supervisor creates the work order.
2. Supervisor assigns staff, agency, or vendor.
3. Assignee starts work; the event is timestamped.
4. Supervisor records progress, notes, and evidence.
5. Blockers and revised dates are recorded explicitly.
6. Supervisor marks the work completed.
7. Admin or authorized verifier reviews evidence and verifies/reopens it.
8. Related costs can be sent to the existing expense workflow, subject to approval.

Recurring work orders should support daily, weekly, monthly, and custom schedules.

## 10. Complaints, Incidents, Inspections, and Handover

### 10.1 Complaint handling

- Convert a resident complaint into a work order.
- Assign it to the supervisor while preserving the original complainant and flat.
- Let the supervisor add updates visible to the resident, plus internal notes visible only to staff/admins.
- Record response time and resolution time.
- Require verification or resident feedback when configured.

### 10.2 Incident register

Incident examples include security issues, equipment failure, water leakage, fire alarms, injuries, rule violations, and vendor disputes.

Capture severity, location, occurrence time, reporter, people involved, immediate action, escalation, evidence, follow-up work, and closure approval.

Critical incidents should notify admins immediately. Sensitive incidents must have restricted visibility.

### 10.3 Inspections

- Reusable inspection templates.
- Scheduled and ad-hoc inspections.
- Pass/fail/not-applicable answers.
- Mandatory note or photo on failure.
- Automatic work-order creation for failed items.
- Completion and reviewer signatures/acknowledgements.

### 10.4 Shift handover

Supervisors should record:

- Open work and complaints.
- Incidents during the shift.
- Important visitors/vendors expected.
- Keys, devices, or documents handed over.
- Equipment status.
- Attendance shortages.
- Notes for the next shift.
- Sender and receiver acknowledgement.

## 11. Daily Operations Report

The system should assemble a draft report from the day's records and allow the supervisor to add a summary.

The report should contain:

- Attendance and staffing shortages.
- Work opened, progressed, completed, and overdue.
- Complaints received and resolved.
- Incidents and escalations.
- Vendor visits.
- Inspections and failures.
- Material usage and expense requests.
- Important notes and next-day priorities.
- Submission timestamp and supervisor identity.

After submission, edits should create a new revision. Admin acknowledgement and comments should be retained.

## 12. Audit and Accountability

Every material write must produce an immutable audit event.

Minimum audit fields:

- `societyAccountId`
- `actorUserId`
- `actorStaffId`, when applicable
- Actor name and role snapshots
- Action type
- Entity type and ID
- Timestamp
- Request/correlation ID
- Source IP and device/user-agent metadata where legally appropriate
- Before and after values for important changes
- Reason for corrections, cancellations, or overrides

Examples:

```text
09:02 - Supervisor Ramesh marked Guard Amit present for the Morning shift.
10:18 - Supervisor Ramesh assigned WO-1042 to BrightLift Services.
15:46 - Supervisor Ramesh uploaded two completion photos to WO-1042.
17:05 - Supervisor Ramesh marked WO-1042 completed.
18:12 - Admin Ajay verified WO-1042.
```

Audit events must not be editable or hard-deleted through normal application APIs.

## 13. Notifications

### 13.1 Supervisor notifications

- Upcoming or missed shift attendance.
- Staffing shortage.
- Newly assigned complaint or work.
- Overdue work order.
- Scheduled vendor visit.
- Inspection due.
- Admin comment or reopened work.
- Daily report reminder.

### 13.2 Admin notifications

- Critical incident.
- Agency staffing shortage.
- Attendance correction request.
- High-value expense request.
- Overdue emergency/high-priority work.
- Supervisor daily report submitted or missed.
- Staff access or security change.

Start with in-app notifications. Add email, SMS, or WhatsApp only through configured providers and explicit notification preferences.

## 14. Proposed Data Model

Suggested new or extended entities:

### 14.1 Access

- `society_staff_access`
- `society_staff_invitation`
- `society_access_permission` or role-to-permission configuration

### 14.2 Agencies and staffing

- `society_agency`
- `society_agency_contract`
- `society_agency_worker`
- `society_shift`
- `society_staff_shift_assignment`
- `society_attendance`
- `society_attendance_correction`

### 14.3 Daily operations

- `society_work_order`
- `society_work_assignment`
- `society_work_update`
- `society_work_attachment`
- `society_daily_checklist_template`
- `society_daily_checklist_entry`
- `society_incident`
- `society_inspection_template`
- `society_inspection`
- `society_shift_handover`
- `society_daily_report`

### 14.4 Shared platform services

- `audit_event`
- `notification`
- Existing expense and vendor records linked through IDs rather than duplicated.

All operational tables should contain `account_id` and queries must scope by that ID to prevent cross-society data access.

## 15. Suggested APIs

### 15.1 Staff access

```http
POST   /api/society/staff/{staffId}/access/invitations
GET    /api/society/staff/{staffId}/access
PATCH  /api/society/staff/{staffId}/access
POST   /api/society/staff/{staffId}/access/suspend
POST   /api/society/staff/{staffId}/access/revoke
POST   /api/staff-invitations/{token}/accept
```

### 15.2 Agencies, workers, and shifts

```http
GET/POST       /api/society/agencies
GET/PUT/DELETE /api/society/agencies/{id}
GET/POST       /api/society/agencies/{id}/workers
GET/POST       /api/society/shifts
GET/POST       /api/society/shift-assignments
```

### 15.3 Attendance

```http
GET  /api/society/attendance?date=YYYY-MM-DD
POST /api/society/attendance/bulk
POST /api/society/attendance/{id}/check-out
POST /api/society/attendance/submit
POST /api/society/attendance/{id}/correction-requests
POST /api/society/attendance/correction-requests/{id}/approve
GET  /api/society/attendance/reports/monthly
```

Bulk attendance should be transactional and idempotent so retrying a request does not create duplicate entries.

### 15.4 Work and daily operations

```http
GET/POST       /api/society/work-orders
GET/PUT        /api/society/work-orders/{id}
POST           /api/society/work-orders/{id}/assignments
POST           /api/society/work-orders/{id}/updates
POST           /api/society/work-orders/{id}/complete
POST           /api/society/work-orders/{id}/verify
GET/POST       /api/society/incidents
GET/POST       /api/society/inspections
GET/POST       /api/society/shift-handovers
GET/POST/PATCH /api/society/daily-reports
GET            /api/society/audit-events
```

## 16. Frontend Information Architecture

Recommended Society navigation:

```text
Operations
├── Today's Dashboard
├── Work Orders
├── Complaints
├── Daily Checklist
├── Incidents
├── Inspections
└── Shift Handover

Workforce
├── Staff
├── Agencies
├── Workers
├── Shifts & Roster
├── Today's Attendance
└── Attendance Reports

Reports
├── Daily Operations Reports
├── Work Performance
├── Agency Compliance
└── Audit Trail
```

Navigation must be filtered by permissions. Direct URL access must still be checked by the API.

The main attendance interface should be mobile-friendly because it will often be used while walking around the society. Provide large status controls, fast search, bulk marking, offline-safe draft handling where feasible, and clear unsaved/submitted state.

## 17. Security and Privacy Requirements

- Enforce society tenancy and permissions in every backend service/API.
- Use expiring, single-use invitation tokens stored as secure hashes.
- Require verified email/mobile before invitation acceptance.
- Rate-limit authentication, invitation, OTP, and upload endpoints.
- Restrict supervisors from role management, bank settings, and sensitive reports.
- Use signed/private attachment access, not public file URLs.
- Validate file type and size and scan uploads when infrastructure permits.
- Log access changes and sensitive record views.
- Support immediate token/session invalidation after suspension or revocation.
- Avoid exposing unnecessary resident information to staff.
- Define retention rules for attendance, identity documents, photos, and audit logs.
- Avoid collecting continuous location data; if location evidence is introduced, obtain consent and define a narrow purpose.

## 18. Backend Integration Approach

The authentication layer should resolve the active society context in this order:

1. Confirm the authenticated user.
2. Resolve either active society membership or active staff access for the selected account.
3. Build an effective permission set from the relationship and role.
4. Apply account-level tenant scoping.
5. Authorize the requested operation.
6. Write an audit event for material changes.

Replace checks such as `role != MEMBER` with named permission checks, for example:

```text
SOCIETY_STAFF_VIEW
SOCIETY_ATTENDANCE_RECORD
SOCIETY_ATTENDANCE_APPROVE_CORRECTION
SOCIETY_WORK_ORDER_MANAGE
SOCIETY_WORK_ORDER_VERIFY
SOCIETY_INCIDENT_MANAGE
SOCIETY_EXPENSE_REQUEST_CREATE
SOCIETY_STAFF_ACCESS_MANAGE
```

This prevents future roles from requiring scattered conditional changes throughout the application.

## 19. Migration and Backward Compatibility

1. Add the new access and operational tables without changing existing membership behavior.
2. Keep current staff records valid.
3. Add **Grant access** to existing active staff records.
4. Identify users currently assigned the member `SUPERVISOR` role.
5. For genuine employees, allow an admin-assisted migration that links the user to a staff record and creates `SocietyStaffAccess`.
6. Preserve historical actions and membership records during migration.
7. After migration, remove the staff-specific meaning of `SUPERVISOR` from member-role selection, or rename it if it represents a committee role.

The migration must never automatically assume that every current supervisor-role member is an employee.

## 20. Delivery Plan

Status legend: `[x]` complete, `[ ]` pending. A phase is checked only when every item in that phase is complete.

### [x] Phase 1: Staff identity and secure workspace access (complete)

- [x] Extend the staff profile with employment type and agency link.
- [x] Add the `SocietyStaffAccess` association and persistence model.
- [x] Add secure, expiring staff invitations with acceptance and contact verification.
- [x] Include active staff-access workspaces in the user's workspace list/switching flow.
- [x] Enforce the staff role and active access status in backend society authorization.
- [x] Add admin UI and APIs to grant, suspend, reactivate, and revoke access.
- [x] Add invitation UI, including resend and expiry handling.
- [x] Add immutable audit events for access changes.

**Outcome:** A supervisor can log in to the society without appearing as a resident.

### [x] Phase 2: Attendance foundation (complete)

- [x] Add agencies and agency workers.
- [x] Add shifts, posts, and roster assignments.
- [x] Build today's attendance screen and bulk submission.
- [x] Support replacement workers and shortage calculation.
- [x] Add lock and correction workflow.
- [x] Add daily and monthly reports.

**Outcome:** The supervisor can reliably record direct and agency staff attendance.

### [x] Phase 3: Work orders and complaint integration (complete)

- [x] Add work orders, assignments, updates, attachments, and verification.
- [x] Connect complaints, vendors, staff, agencies, and expenses.
- [x] Add recurring work.
- [x] Add overdue and priority notifications.

**Outcome:** Everyday society work has an owner, status, evidence, cost, and completion trail.

### [x] Phase 4: Daily operations (complete)

- [x] Add configurable daily checklists.
- [x] Add incident and inspection registers.
- [x] Add shift handover.
- [x] Generate and submit daily reports.
- [x] Add admin dashboards and acknowledgements.

**Outcome:** Admins can review a complete daily operational picture without relying on chat messages or paper registers.

### [ ] Phase 5: Reporting and automation (pending)

- [ ] Agency compliance and supervisor performance reports.
- [ ] CSV/PDF exports.
- [ ] Recurring schedules and escalations.
- [ ] Optional QR/biometric import adapters.
- [ ] Optional limited worker self-service.

## 21. Testing Strategy

### 21.1 Unit tests

- Permission resolution for every access role.
- Invitation expiry, reuse prevention, and contact matching.
- Attendance uniqueness, shift overlap, lateness, overtime, and shortage calculations.
- Work-order state transitions.
- Daily report generation.
- Audit-event creation.

### 21.2 Integration tests

- A staff user can access only the invited society.
- A suspended user loses access immediately.
- A supervisor can record attendance but cannot approve their own locked-period correction.
- Agency replacement attendance preserves the absent worker and replacement records.
- A supervisor cannot manage roles or view restricted financial settings.
- A work order can flow from complaint through verification.
- Cross-society IDs cannot be used to read or modify data.

### 21.3 End-to-end tests

- Admin creates staff, sends invitation, and supervisor accepts it.
- Supervisor switches to the staff workspace.
- Supervisor takes morning attendance and records a shortage/replacement.
- Supervisor creates and completes a work order with photographs.
- Admin verifies the work and reviews the audit timeline.
- Supervisor submits the daily report.
- Admin suspends the supervisor and further access is denied.

### 21.4 Non-functional tests

- Mobile usability for attendance and photo uploads.
- Concurrent attendance submissions and idempotent retry behavior.
- Large monthly registers and paginated reports.
- Attachment authorization.
- Audit integrity.
- Timezone and day-boundary behavior for night shifts.

## 22. Definition of Done and Acceptance Criteria

The initial feature is complete when:

- A staff supervisor can receive and accept a secure invitation.
- The supervisor receives the society workspace without becoming a society member.
- Admins can suspend and revoke access immediately.
- Supervisors see only permitted navigation and APIs.
- Direct and agency workers can be rostered by shift and post.
- Supervisors can record, submit, and check out attendance from a mobile-friendly screen.
- Agency headcount shortages and replacements are visible.
- Attendance corrections require a reason and preserve the original values.
- Supervisors can create, assign, update, and complete work orders.
- Completion supports notes and before/after evidence.
- Admins can verify or reopen completed work.
- A daily operations report summarizes attendance, work, complaints, incidents, and inspections.
- Every sensitive or operational change identifies the actor, time, society, and affected record.
- Automated tests prove tenant isolation and permission enforcement.

## 23. Recommended MVP

Build the smallest useful release in this order:

1. Staff access invitation and workspace switching.
2. Permission-based authorization and audit events.
3. Agencies, workers, shifts, and today's attendance.
4. Attendance submission, correction, and monthly report.
5. Work orders with assignment, status, notes, and photographs.
6. Daily supervisor report and admin review.

This MVP provides secure staff access, workforce accountability, and evidence of daily work while leaving payroll automation, biometrics, and advanced integrations for later releases.
