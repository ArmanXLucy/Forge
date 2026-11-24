# Phase 3 — Admin Integration Audit

**Project:** Forge Athletic  
**Audit date:** 2026-08 (repository state before Phase 3 edits)  
**Scope:** Existing admin panel, Firebase Authentication, Firestore schema and rules, member-facing content, Help Desk, content management, audit logging.

> This audit describes what exists in the repository. It does not treat previous reports as proof that a feature works. No production data was read or changed.

---

## 1. Existing Admin Panel Architecture

The admin panel is already a separate, role-aware application area under `/admin`; it is not a mock dashboard and it is not a duplicate panel.

| Area | Existing implementation | Audit result |
|---|---|---|
| Routing | `src/App.tsx` lazy-loads 19 admin pages under `AdminLayout`. | Implemented |
| Route protection | `RequireAdmin`, `RequireAdminPermission`, `AdminAccessProvider`. | Implemented |
| Admin identity | `adminUsers/{uid}` documents with `role`, `permissions`, `active`. | Implemented |
| Navigation | `src/components/navigation/adminNav.ts`, permission-filtered. | Implemented |
| Design system | Shared `AdminPanel`, `AdminStat`, `AdminPageHeader`, `EntityManager`, existing table/card styles. | Implemented |
| Dashboard | Reads Firestore through `useAdminSnapshot`. | Implemented, but reads entire activity collections |
| Users | Real member documents from `users`, detail modal, suspend/reactivate. | Partial |
| Workout / exercise / nutrition content | Real Firestore CRUD via `EntityManager`. | Partial — not consumed by members |
| Missions | Real `missionSettings` toggles, already consumed by member Missions page. | Implemented |
| Help Desk | Real tickets, messages, internal notes, assignment, status. | Implemented, but reads every ticket |
| Notifications | Broadcasts per-user `notifications` documents. | Implemented |
| Announcements | No announcement entity, publishing state, edit or delete. | Missing |
| Audit log | Writes to `adminActivityLogs` for some actions. | Partial — no review UI, several actions unlogged |
| Analytics | Firestore-derived charts and CSV export. | Implemented, but relies on whole-collection snapshot |
| AI monitoring | Reads saved AI session records and model metadata. | Implemented; no model changes required |

The visual design, navigation groups, typography, cards, tables and responsive behavior must remain unchanged. Phase 3 only adds the states and controls needed for integration.

---

## 2. Authentication and Authorization

### Current behavior

- Firebase Authentication is the only auth provider.
- An authenticated user is an administrator only when `adminUsers/{uid}` exists with `active == true`.
- `firestore.rules` derives all privileged permissions from the admin document, not from client state.
- `adminUsers` cannot be created by an ordinary member.
- Protected routes are also backed by Firestore rules; direct database calls are denied where rules say no.
- Demo accounts are rejected from admin access.
- Suspended members can read their root `users/{uid}` document but are denied member subcollections.

### Weaknesses and gaps

1. **Custom claims are not used.** Admin role is a Firestore document, and every rule performs a `get()` on `adminUsers/{uid}`. This is compatible with the current architecture and does not require a paid backend, but it increases rule document reads.
2. **`adminUsers` writes are lightly validated.** A Super Admin can write arbitrary fields to an admin document because the rule only checks the caller, not the document shape.
3. **User root updates by administrators are not shape-validated.** `canManageUsers()` can update any field, including fields outside the intended account-management surface.
4. **No trusted server-side administration.** Suspension is enforced by rules, so a suspended user cannot write member data from the browser. However, Firebase Auth can still authenticate the account; the restriction is on Firestore data, not Auth session creation.
5. **No admin activity log viewer.** Actions are written but cannot be reviewed in the UI.
6. **Some privileged actions are not logged:** role changes, admin activation/deactivation, provisioning, content CRUD, announcement changes.

### Decision

Keep the existing Firestore-backed role model and rules. Adding Firebase custom claims would require an Admin SDK/Cloud Function deployment that is outside this phase's free, existing architecture. Tighten rules, validate writes, log every privileged action, and test direct Firestore access in the emulator.

---

## 3. Existing Firestore Schema

| Collection / path | Purpose | Current access |
|---|---|---|
| `users/{uid}` | Root member profile/account record | Owner or admin; owner cannot self-write admin fields |
| `users/{uid}/missions/{missionId}` | Mission progress | Owner/admin, suspended owner denied |
| `users/{uid}/workouts/{id}` | Completed workout records | Owner/admin, suspended owner denied |
| `users/{uid}/progress_records/{id}` | Measurements | Owner/admin, suspended owner denied |
| `users/{uid}/nutrition_logs/{id}` | Daily nutrition logs | Owner/admin, suspended owner denied |
| `users/{uid}/lifestyle_logs/{id}` | Lifestyle entries | Owner/admin, suspended owner denied |
| `users/{uid}/ai_sessions/{id}` | Saved AI Coach sessions | Owner/admin, suspended owner denied |
| `users/{uid}/mission_answers/{missionId}` | Sensitive AI plan inputs | Owner/user-management admin only |
| `users/{uid}/workout_recommendations/{id}` | Generated ONNX plans | Owner/user-management admin only |
| `adminUsers/{uid}` | Admin role and permission record | Super Admin manages; admin can read; owner can edit name/login |
| `supportTickets/{ticketId}` | Ticket root and current status | Owner or support role |
| `supportTickets/{ticketId}/messages/{id}` | Conversation | Ticket owner or support role |
| `supportTickets/{ticketId}/internal_notes/{id}` | Private admin notes | Support role only |
| `notifications/{id}` | Per-user in-app notifications | Owner/admin |
| `adminActivityLogs/{id}` | Admin audit records | Admin create/read; immutable |
| `workoutPlans/{id}` | Admin workout catalog | Content roles only — **member read missing** |
| `exerciseLibrary/{id}` | Admin exercise catalog | Content roles only — **member read missing** |
| `nutritionPlans/{id}` | Admin nutrition guidance | Content roles only — **member read missing** |
| `missionSettings/{missionId}` | Mission visibility | Signed-in read; content write |
| `platformSettings/main` | Support defaults | Super Admin only |

No duplicate user, workout, mission, nutrition, progress or support collection should be created.

---

## 4. Existing Disconnected Features

### 4.1 Workout content

- `Workout Plans` in admin writes `workoutPlans`.
- `Exercise Library` writes `exerciseLibrary`.
- The member Workouts page uses static sample plans, the AI recommendation plan, and `WORKOUTS`; it never reads either admin collection.
- Firestore rules also deny members `workoutPlans` and `exerciseLibrary` reads.

**Result:** an administrator can publish content that no member can see.

### 4.2 Nutrition content

- Admin `Nutrition` writes `nutritionPlans`.
- Member Nutrition uses static `NUTRITION_TARGETS`, `DAILY_MEALS`, and the member's own meal log; it never reads `nutritionPlans`.
- Rules deny member reads.

**Result:** disconnected.

### 4.3 Announcements

- Admin `Notifications` sends per-user notification documents.
- There is no announcement document with draft/published state, scheduling, edit, unpublish or delete.
- Members only see notifications in the topbar, with no durable announcement surface.

**Result:** no announcement lifecycle.

### 4.4 Audit activity

- `logAdminActivity` writes for suspension, reactivation, ticket status/priority/assignment, internal notes, settings and broadcast.
- There is no activity log page.
- Content CRUD, role changes, admin activation and announcement actions are not logged.

### 4.5 Help Desk

- Member side and admin side already use the same ticket/message schema.
- Admin replies create a notification and set status to `waiting_for_user`.
- Member replies reopen resolved/waiting tickets.
- Admin ticket page loads all internal notes and all messages without pagination.
- Admin queue loads every ticket and filters in memory.
- Search only works over the already-loaded local array.

---

## 5. Security Findings

| ID | Finding | Severity | Action |
|---|---|---|---|
| S1 | Content collections are not readable by members, so content management cannot affect the app | High (functionality) | Add member read rules restricted to published records |
| S2 | `workoutPlans`, `exerciseLibrary`, `nutritionPlans` allow arbitrary writes to content roles | Medium | Validate status/shape in rules where practical |
| S3 | `adminUsers` writes lack field-shape validation | Medium | Add role/active/uid validation |
| S4 | Admin user updates can modify arbitrary user fields | Medium | Restrict administrator update keys; keep owner update path |
| S5 | Suspension reason is not recorded | Medium | Store reason, timestamp and acting administrator |
| S6 | Audit log is immutable but easy to omit; not all privileged actions log | Medium | Log content, role, announcement and user actions |
| S7 | Audit records contain free-text `detail`; could accidentally include sensitive data | Low | Keep details to identifiers/status; never passwords/tokens |
| S8 | No index configuration for paginated admin queries | Medium | Add composite indexes |
| S9 | Admin list/search reads whole collections | Medium | Paginate and bound queries |
| S10 | No announcement collection | Medium | Add `announcements` with published-only member reads |
| S11 | `platformSettings` default support email is fabricated (`hello@forge-athletic.ch`) | Low | Replace with empty/configurable value |
| S12 | Admin login placeholder uses a fabricated domain | Low | Change to a neutral placeholder |
| S13 | Suspended members are blocked from the dashboard shell, including the Help Desk UI | Low | Keep Firestore support path; document UI limitation |
| S14 | Client-generated AI recommendations remain client-writable by design | Known | Not changed in Phase 3; documented in Phase 1/2 |
| S15 | No automated tests for admin/support/announcement rules | High | Add emulator tests for all new paths |

### Suspension enforcement

Rules already check `accountStatus` on every member subcollection through `isSuspended(uid)`; this is the enforcement boundary. A suspended member cannot bypass it by changing Zustand/localStorage or calling Firestore directly. The browser UI check is only explanatory. This remains the correct architecture for the current client-only app.

### Privileged operations and trusted backend

All current admin writes are Firestore client writes authorized by rules. No Firebase Admin SDK credentials exist in the frontend. The operations in this phase (suspend, content CRUD, tickets, announcements, audit) can be safely expressed as rule-authorized client writes. A trusted backend is not required for these operations.

Account deletion and Firebase Auth account disabling are **not** implemented because they require the Admin SDK. They remain documented limitations rather than insecure browser workarounds.

---

## 6. Missing Integrations and Implementation Plan

### Step A — Security foundation

1. Add member read access for published `workoutPlans` and `nutritionPlans`; signed-in read for `exerciseLibrary`.
2. Add `announcements` collection rules:
   - members read published announcements only;
   - platform/content admins write;
   - validated fields and timestamps.
3. Restrict administrator user-document updates to an allow-list of account-management fields.
4. Validate `adminUsers` create/update shape and role values.
5. Add rules tests for every new allow/deny path.

### Step B — Dashboard aggregation

1. Add `getAdminOverview()` using Firestore aggregate `count()` queries for totals and bounded 7/30-day activity reads.
2. Return registration trend, activity trend, ticket breakdown, AI exercise mix, recent users/workouts/tickets and partial-read warnings.
3. Replace the Overview page's whole-collection snapshot with the aggregated data while preserving every card/chart.
4. Keep error, loading and empty states; surface partial-data warnings instead of inventing values.

### Step C — User management

1. Add server-side paginated user queries with status and registration-date filters.
2. Add server-side prefix search for name/email plus exact UID lookup; cap search results.
3. Add aggregate counts for total/suspended/new users.
4. Add recent workouts, measurements, mission summary, nutrition count, AI count and recent support tickets to user detail.
5. Add suspension reason/review flow, store `suspensionReason`, `suspendedAt`, `suspendedBy`, `suspendedByName`.
6. Log suspend/reactivate with reason.
7. Show the suspension reason to the member on the suspended-account screen.

### Step D — Content integration

1. Add member readers for published workout plans and nutrition plans.
2. Add a compact published workout library to the member Workouts page.
3. Add a compact published nutrition guidance section to the member Nutrition page.
4. Add an exercise library reference section only when records exist; do not alter AI Coach or its model.
5. Add admin `EntityManager` audit logging for create/update/delete.
6. Add a publish/unpublish quick action in `EntityManager` where the entity has `status`.

### Step E — Help Desk

1. Add bounded, paginated ticket queue.
2. Keep status filtering server-side; support search by ticket ID/email/name prefix.
3. Apply additional filters server-side where practical and document bounded-scan behavior for combinations that would require an index explosion.
4. Add pagination to ticket messages/internal notes or cap displayed messages with a "load earlier" control.
5. Ensure all status, priority, assignment, reply and note actions are logged.
6. Keep user/admin access isolation and test it.

### Step F — Announcements and audit

1. Add `announcements` service with create, edit, publish, unpublish and delete.
2. Add announcement management to the existing Notifications page using existing panels/modals.
3. Render published announcements on the member Overview page.
4. Add `adminActivityLogs` listing service and an Activity Log page using the existing admin design.
5. Add an `Activity log` navigation item under Platform.
6. Log role changes, admin activation, provisioning, content operations and announcement operations.

### Step G — Verification

1. Run Firestore emulator rules tests as member, admin, support, fitness, analyst, suspended and unauthenticated users.
2. Run `tsc`, unit tests and production build.
3. Test member/admin interactions in the emulator or seeded demo data:
   - user pagination/search/filter;
   - suspension/reactivation with reason;
   - content publish → member visibility;
   - ticket create/reply/status → member visibility;
   - announcement publish → member banner;
   - audit log entries.
4. Do not run destructive tests against production data.

---

## 7. Data and Compatibility Decisions

- Do not duplicate existing member subcollections.
- Do not replace the AI recommendation pipeline or its exercise catalog.
- Admin workout/nutrition content is additive: the AI plan and existing sample content remain available; admin-published records appear as a separate library.
- `announcements` is a new collection because no equivalent publishable entity exists.
- `adminActivityLogs` already exists and is reused.
- `supportTickets` and its subcollections already exist and are reused.
- `platformSettings/main` is reused.
- Existing documents are not migrated or deleted.
- Firestore indexes are additive.

---

## 8. Required Indexes

| Collection | Fields | Reason |
|---|---|---|
| `users` | `accountStatus ASC, createdAt DESC` | Filtered user pages |
| `users` | `createdAt ASC` (single field automatic) | Registration periods |
| `supportTickets` | `status ASC, lastMessageAt DESC` | Status-filtered queue |
| `supportTickets` | `userId ASC, lastMessageAt DESC` | Member ticket history for admin detail |
| `announcements` | `status ASC, publishedAt DESC` | Published member announcements |
| `adminActivityLogs` | `createdAt DESC` (single field automatic) | Audit page |

If a query combination requires a large index set, the implementation uses an explicitly bounded scan and reports that limitation instead of silently dropping filters.

---

## 9. Known Limitations To Carry Into the Implementation Report

- Firestore has no substring/full-text search. User/ticket search is prefix-based plus exact identifiers, not arbitrary middle-of-string matching.
- Active-user counts are based on saved workouts, completed missions and AI sessions; they are not Auth login telemetry because no login event collection exists.
- Firebase Auth-level account disabling and account deletion require the Admin SDK and are not exposed.
- Admin permissions are still verified with Firestore rule reads rather than custom claims.
- Suspended members can use Firestore support paths by rules, but the current dashboard shell blocks the Help Desk UI. This is documented, not silently changed.
- Announcement delivery is in-app only; no email or push provider exists.
- AI model behavior, model files, MediaPipe and workout recommendation code are out of scope.
