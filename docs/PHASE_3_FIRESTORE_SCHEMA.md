# Phase 3 — Firestore Schema and Security Reference

**Project:** Forge Athletic  
**Database:** Firebase Firestore  
**Auth:** Firebase Authentication  
**Rules:** `firestore.rules`  
**Indexes:** `firestore.indexes.json`

This document describes the collections used by the Phase 3 admin integration. Existing member collections were preserved; no collection was renamed, duplicated or deleted. `announcements` is the only new top-level collection.

---

## 1. Collection Overview

| Path | Purpose | Used by |
|---|---|---|
| `users/{uid}` | Root member/account record | Member app, admin users, analytics |
| `users/{uid}/missions/{missionId}` | Mission progress | Member missions, admin dashboard/detail |
| `users/{uid}/workouts/{id}` | Completed workouts | Member workouts, admin dashboard/detail |
| `users/{uid}/progress_records/{id}` | Measurements | Member progress, admin detail |
| `users/{uid}/nutrition_logs/{day}` | Daily meals/water/totals | Member nutrition, admin detail |
| `users/{uid}/lifestyle_logs/{id}` | Lifestyle entries | Member lifestyle, monitoring |
| `users/{uid}/ai_sessions/{id}` | AI Coach session records | Member progress, admin AI monitoring |
| `users/{uid}/mission_answers/{missionId}` | Sensitive profile/AI plan inputs | AI plan, restricted admin access |
| `users/{uid}/workout_recommendations/{id}` | Browser-generated ONNX plans | AI plan, restricted admin access |
| `adminUsers/{uid}` | Admin identity, role, active state, permissions | Admin auth and all privileged rules |
| `supportTickets/{ticketId}` | Support ticket root | Member Help Desk, admin Help Desk |
| `supportTickets/{ticketId}/messages/{id}` | Ticket conversation | Member Help Desk, admin Help Desk |
| `supportTickets/{ticketId}/internal_notes/{id}` | Private admin notes | Admin only |
| `notifications/{id}` | Per-user in-app notifications | Member topbar, admin notifications |
| `adminActivityLogs/{id}` | Immutable admin audit records | Admin activity page, dashboard |
| `workoutPlans/{id}` | Admin workout catalog | Admin content, member Workouts library |
| `exerciseLibrary/{id}` | Admin exercise reference | Admin content, member Workouts reference |
| `nutritionPlans/{id}` | Admin nutrition guidance | Admin content, member Nutrition library |
| `missionSettings/{missionId}` | Mission visibility toggles | Member missions, admin missions |
| `platformSettings/main` | Support defaults, maintenance message | Admin settings |
| `announcements/{id}` | **New** durable member announcements | Admin announcements, member Overview |

---

## 2. Member and Account Documents

### `users/{uid}`

Important fields:

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `fullName` | string | Display name |
| `email` | string | Account email |
| `photoURL` | string/null | Provider avatar |
| `avatarUrl` | string/null | Supabase profile image |
| `avatarPath` | string/null | Storage object path |
| `accountStatus` | `"active"` / `"suspended"` | Enforcement field for member subcollections |
| `suspensionReason` | string/null | Phase 3 addition; shown to the member |
| `suspendedAt` | timestamp/null | Phase 3 addition |
| `suspendedBy` | string/null | Admin UID |
| `suspendedByName` | string/null | Admin display name |
| `adminNote` | string/null | Admin-only note |
| `age`, `heightCm`, `weightKg` | number | Profile |
| `fitnessGoal`, `fitnessLevel` | string | Profile |
| `preferredWorkoutDays` | number[] | Profile |
| `profileCompletedAt` | string | ISO timestamp |
| `createdAt`, `updatedAt` | timestamp | Server timestamps |

New accounts are created with `accountStatus: "active"`. A member may backfill only `active` when the field is missing. A suspended member cannot write `accountStatus`.

### Member subcollections

Rules require owner access plus a non-suspended root document:

- `missions`: owner read/write; admins read.
- `workouts`, `progress_records`, `nutrition_logs`, `lifestyle_logs`, `ai_sessions`: owner read/write; admins read.
- `mission_answers`: owner read/write with shape validation; only `manage_users` admins read.
- `workout_recommendations`: owner read/write with shape validation; only `manage_users` admins read.

Suspended members retain read access to their root `users/{uid}` and support paths, but member subcollections are denied.

---

## 3. Admin Identity

### `adminUsers/{uid}`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Must match document ID |
| `email` | string | Admin email |
| `name` | string | Display name |
| `role` | `super_admin` / `admin` / `fitness_manager` / `support_manager` / `analyst` | Permission source |
| `permissions` | string[] | UI display; rules use role |
| `active` | boolean | Inactive admins are denied privileged access |
| `createdAt`, `updatedAt`, `lastLoginAt` | timestamp | Audit metadata |

Rules:

- Read: own record or any active admin.
- List: active admin.
- Create/update: Super Admin with validated `uid`, role, active and optional permissions list.
- Self-update: only `name`, `lastLoginAt`, `updatedAt`.
- Delete: Super Admin, not self.

Custom claims are not used. Every rule resolves the admin document through `get()`. This preserves the current architecture and avoids a paid backend; the trade-off is additional rule document reads.

---

## 4. Support

### `supportTickets/{ticketId}`

| Field | Type |
|---|---|
| `ticketId` | string (`FRG-XXXXXX`) |
| `userId`, `userName`, `userEmail` | string |
| `subject`, `description` | string |
| `category` | enum |
| `priority` | `low` / `medium` / `high` / `urgent` |
| `status` | `open` / `in_progress` / `waiting_for_user` / `resolved` / `closed` |
| `assignedAdminId`, `assignedAdminName` | string |
| `messageCount` | number |
| `createdAt`, `updatedAt`, `lastMessageAt` | timestamp |
| `resolvedAt` | timestamp/null |
| `schemaVersion` | number |

Members can create only their own ticket with validated subject/description/status/priority/category. They can read only their own ticket. Support roles can read and update all tickets. Only Super Admin can delete tickets.

### `messages/{messageId}`

```
{
  ticketId, senderId, senderName, senderRole: "user" | "admin",
  message, createdAt, schemaVersion
}
```

- Members read/write messages only for their own ticket and only when the ticket is not closed.
- Support roles read all ticket messages and write admin messages.
- Messages are append-only (`update/delete: false`).
- Admin replies set the ticket to `waiting_for_user`; member replies reopen `waiting_for_user` or `resolved` tickets.
- Admin replies create a per-user support notification and an audit entry.

### `internal_notes/{noteId}`

Support-role read/create only; update/delete restricted to Super Admin. Notes are never exposed to members.

---

## 5. Admin Audit Log

### `adminActivityLogs/{id}`

```
{
  adminId, adminName, action, targetType, targetId, detail,
  metadata?: map, createdAt, schemaVersion
}
```

Rules:

- Read: active admin.
- Create: active admin, `adminId == request.auth.uid`.
- Update/delete: denied for everyone from the client.

Recorded actions include:

- `user.suspend`, `user.reactivate`, `user.update`
- `admin.provision`, `admin.role`, `admin.active`
- `content.create`, `content.update`, `content.delete`, `content.publish`, `content.unpublish`
- `announcement.create`, `announcement.update`, `announcement.publish`, `announcement.unpublish`, `announcement.delete`
- `ticket.reply`, `ticket.status`, `ticket.priority`, `ticket.assign`, `ticket.internal_note`
- `notification.broadcast`, `platform.settings.update`

Details contain identifiers, labels and statuses only. Passwords, tokens, medical answers and authentication secrets are not logged.

---

## 6. Content Collections

### `workoutPlans/{id}`

Fields: `title`, `focus`, `difficulty`, `durationMinutes`, `daysPerWeek`, `description`, `exercises`, `status`, `createdAt`, `updatedAt`.

- Content roles can read/write all states.
- Signed-in members can read only `status == "published"`.
- Draft and archived plans are not readable by members.
- The member Workouts page shows published plans in a separate coaching-library section. It does not replace the AI plan.

### `exerciseLibrary/{id}`

Fields: `name`, `muscleGroups`, `difficulty`, `instructions`, `aiSupported`, `repCounting`, timestamps.

- Signed-in members can read.
- Content roles write.
- The member Workouts page shows an exercise reference section when records exist.
- AI Coach continues to use its own fixed three-exercise model catalog. Admin exercise metadata does not alter model behavior.

### `nutritionPlans/{id}`

Fields: `name`, `goal`, macros, `notes`, `status`, timestamps.

- Members read published records only.
- Content roles read/write.
- The member Nutrition page displays published guidance as an additional section; it does not replace the member log or AI workout logic.

### `missionSettings/{missionId}`

Read by any signed-in user; written by content roles. Existing Mission visibility behavior is preserved.

---

## 7. Announcements

### `announcements/{id}`

| Field | Type | Notes |
|---|---|---|
| `title` | string | 3–140 characters |
| `body` | string | 10–4,000 characters |
| `status` | `draft` / `published` / `archived` | Member visibility |
| `tone` | `info` / `update` / `maintenance` | Display styling |
| `createdBy` | string | Admin UID |
| `createdByName` | string | Admin display name |
| `createdAt`, `updatedAt` | timestamp | Server timestamps |
| `publishedAt` | timestamp/null | Set when published |
| `schemaVersion` | number | `1` |

Rules:

- Members can `get`/`list` published announcements only.
- Platform admins (`super_admin`) can read all and create/update/delete.
- Create/update requires valid title/body/status/tone, timestamp fields and schema version.
- Members see up to three latest published announcements on the member Overview page.

The new collection is required because the existing `notifications` collection is per-user delivery, not a editable publishable announcement entity.

---

## 8. Required Composite Indexes

Defined in `firestore.indexes.json`:

| Collection group | Fields | Query |
|---|---|---|
| `users` | `accountStatus ASC`, `createdAt DESC` | Status-filtered user pagination |
| `supportTickets` | `status ASC`, `lastMessageAt DESC` | Status-filtered ticket queue |
| `supportTickets` | `userId ASC`, `lastMessageAt DESC` | Member ticket history in admin detail |
| `announcements` | `status ASC`, `publishedAt DESC` | Published member announcements |
| `adminActivityLogs` | `action ASC`, `createdAt DESC` | Audit action filter |

Single-field indexes remain automatic for prefix searches (`fullName`, `email`, `ticketId`, `userEmail`, `userName`, `subject`), aggregate counts, and recent-record ordering. Collection-group indexes for `workouts.completedAt`, `ai_sessions.completedAt` and `missions.completedAt` are enabled through `fieldOverrides` for the bounded 7/30-day dashboard reads.

No extra composite index is created for every ticket priority/category/assignment combination. Those combinations use an explicitly bounded scan of up to 500 already-filtered records.

---

## 9. Query Strategies and Bounds

### Users

- Default listing: server-side `orderBy(createdAt)` + cursor pagination, 12 per page.
- Status and registration-date filters are applied server-side.
- Total counts use `getCountFromServer`.
- Search uses Firestore prefix ranges on `fullName` or `email`, plus exact UID lookup.
- Search is capped at 50 results and is prefix-based, not full-text.
- Legacy accounts without `accountStatus` appear under “All statuses” but are not returned by the “Active” server filter until the member signs in and the safe backfill runs.

### Support tickets

- Default/status-only queue: server-side `orderBy(lastMessageAt)` with cursor pagination.
- Priority/category/assignment combinations: bounded equality-filtered scan up to 500 records, then client pagination.
- Search: prefix queries on ticket ID, subject, member email and member name; capped at 50.
- Ticket messages: latest 200; internal notes: latest 100.

### Dashboard

- Totals use `getCountFromServer` for users, suspended users, workouts, missions, AI sessions, nutrition days and ticket statuses.
- Active users: bounded 30-day reads of workouts, missions and AI sessions, capped at 2,000 per collection.
- Trends: aggregate monthly counts and bounded 7-day activity reads.
- The UI reports when a bounded result set was used instead of presenting a false exact number.

### User detail

- 20 recent workouts.
- 20 recent measurements.
- All mission records (normally seven).
- 7 recent nutrition days.
- 5 recent support tickets.
- Aggregate counts for workouts, measurements, nutrition days, AI sessions and tickets.

---

## 10. Relationships

```
Firebase Auth user
  └── users/{uid}
        ├── missions
        ├── workouts
        ├── progress_records
        ├── nutrition_logs
        ├── lifestyle_logs
        ├── ai_sessions
        ├── mission_answers
        └── workout_recommendations

users/{uid} 1 ─── * supportTickets/{ticketId}
                         ├── messages
                         └── internal_notes

adminUsers/{uid} 1 ─── * adminActivityLogs
                1 ─── * announcements (createdBy)
                1 ─── * supportTickets (assignedAdminId)

workoutPlans / exerciseLibrary / nutritionPlans
  └── member-facing published libraries

announcements
  └── member Overview banner
```

---

## 11. Data Migration and Compatibility

- No existing collection or document is deleted, renamed or migrated.
- New `users/{uid}` documents include `accountStatus: "active"`.
- Existing members without `accountStatus` are treated as active by rules and by the member app.
- On the next successful sign-in, `ensureUserAccount` backfills `accountStatus: "active"` only when the field is absent. Rules permit only that one safe transition for owners.
- Existing suspended accounts are not touched by the backfill.
- Existing `adminUsers` documents are preserved. Role/active updates write the required `uid`, role and permissions fields for validation compatibility.
- Existing content records need no migration. Draft records remain admin-only; published records become member-visible after rules deployment.
- No production data was written during Phase 3 verification.

---

## 12. Deployment Requirements

1. Back up current Firestore rules and indexes.
2. Deploy `firestore.rules` and `firestore.indexes.json` to staging first.
3. Verify the new composite indexes finish building.
4. Add the Render hostname to Firebase Authorized domains if not already done.
5. Verify admin and member flows with test accounts before production.
6. Do not run destructive tests against production data.

The rules/index deployment is intentionally **not** performed automatically by this repository.
