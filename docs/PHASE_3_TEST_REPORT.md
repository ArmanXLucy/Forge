# Phase 3 — Test Report

**Project:** Forge Athletic  
**Phase:** Admin integration  
**Test environment:** Windows, Node 22, local repository, Firestore Emulator Suite, browser smoke test against the local Vite build  
**Production data used:** None  
**Date:** 2026-08

---

## 1. Test Scope

Tested:

- Firestore security rules for admin, member, support, suspended and unauthenticated access.
- Published content visibility and draft isolation.
- Announcement lifecycle and invalid writes.
- Admin account validation and account-management field restrictions.
- Account-status backfill safety.
- Audit immutability.
- TypeScript compilation.
- Existing unit tests.
- Production build and model-asset verification.
- Member browser smoke test on Overview, Workouts and Nutrition.
- Responsive overflow at 390px.

Not tested with real credentials:

- Production Firebase Auth administrator login.
- Production Firestore reads/writes.
- Real Supabase upload.
- Real Google sign-in.
- Real camera/MediaPipe inference.
- Physical mobile device.

No destructive operation was run against production data.

---

## 2. Commands and Results

### TypeScript

```bash
npx tsc --noEmit
```

Result: **PASS** — no diagnostics.

### Unit tests

```bash
npm test
```

Result: **PASS**

```
Test Files  3 passed | 1 skipped (4)
Tests       65 passed | 47 skipped (112)
```

The skipped file is the emulator-only Firestore rules suite.

### Firestore rules emulator

Because a stale local emulator was occupying the default port, the suite was run with a temporary project-local emulator configuration on an alternate port:

```bash
npx firebase-tools@13.35.1 emulators:exec \
  --config .qa/firebase.phase3.json \
  --only firestore \
  --project forge-phase1-rules \
  "npx vitest run tests/firestore.rules.test.ts"
```

Result: **PASS**

```
Test Files  1 passed (1)
Tests       47 passed (47)
```

The temporary `.qa/firebase.phase3.json` is test-only and is not part of the application runtime.

### Production build

```bash
npm run build
```

Result: **PASS**

- Vite production build completed.
- `postbuild` model-asset verification passed for:
  - `workout_recommendation.onnx`
  - `feature_schema.json`
  - squat/bicep curl/push-up form classifiers
  - `model_metadata.json`
  - recommendation and form-model contracts
- Existing chunk-size warning remains; it predates Phase 3.
- `dist` generated successfully.

### Browser member smoke

Tested in headless Chrome at **390 × 844** with the demo member profile:

| Route | Result | Console errors | Horizontal overflow |
|---|---|---|---|
| `/dashboard` | Rendered | 0 | No |
| `/dashboard/workouts` | Rendered | 0 | No |
| `/dashboard/nutrition` | Rendered | 0 | No |

Published-content sections correctly stay hidden for the demo/local profile because there is no authenticated Firestore content source. This avoids showing fabricated or mock coaching content.

---

## 3. Firestore Rules Test Cases

### Authentication and ownership

| Test | Expected | Result |
|---|---|---|
| Unauthenticated read of a user document | Denied | PASS |
| Member reads own root document | Allowed | PASS |
| Member reads another member document | Denied | PASS |
| Member writes another member subcollection | Denied | PASS |
| Member changes own `accountStatus` or `adminNote` | Denied | PASS |
| Member adds role/permission fields | Denied | PASS |
| Member updates ordinary profile field | Allowed | PASS |
| New member sets `accountStatus: suspended` | Denied | PASS |
| New member sets `accountStatus: active` | Allowed | PASS |
| Legacy member backfills only `active` | Allowed | PASS |
| Legacy member tries `suspended` after backfill | Denied | PASS |
| Legacy active member uses subcollections | Allowed | PASS |

### Admin access

| Test | Expected | Result |
|---|---|---|
| Active admin reads member root and mission records | Allowed | PASS |
| Inactive admin reads member root | Denied | PASS |
| Inactive admin reads draft content | Denied | PASS |
| Member lists admin records or self-grants role | Denied | PASS |
| Super Admin provisions a valid admin record | Allowed | PASS |
| Super Admin writes invalid role or non-boolean active | Denied | PASS |
| Admin suspends a user with reason | Allowed | PASS |
| Admin writes arbitrary user fields (`role`, `email`) | Denied | PASS |
| Support manager changes account status | Denied | PASS |
| Content-role restrictions | Preserved | PASS |
| Platform settings restricted to Super Admin | Preserved | PASS |
| Member searches published workout content | Allowed | PASS |
| Member lists all workout plans including drafts | Denied | PASS |
| Member reads published nutrition and exercise content | Allowed | PASS |
| Member reads draft nutrition plan | Denied | PASS |
| Unauthenticated read of coaching content | Denied | PASS |

### Announcements

| Test | Expected | Result |
|---|---|---|
| Platform admin creates a valid draft | Allowed | PASS |
| Platform admin publishes it | Allowed | PASS |
| Platform admin deletes it | Allowed | PASS |
| Invalid short title/body write | Denied | PASS |
| Member creates announcement | Denied | PASS |
| Member reads published announcement | Allowed | PASS |
| Member reads draft announcement | Denied | PASS |
| Member lists only published announcements | Allowed | PASS |
| Member lists all announcements | Denied | PASS |

### Audit logs

| Test | Expected | Result |
|---|---|---|
| Admin reads an audit record | Allowed | PASS |
| Admin updates an audit record | Denied | PASS |
| Admin deletes an audit record | Denied | PASS |

### Suspension and sensitive data

| Test | Expected | Result |
|---|---|---|
| Suspended member reads root account | Allowed | PASS |
| Suspended member reads member subcollections | Denied | PASS |
| Suspended member writes member data | Denied | PASS |
| Suspended member creates support ticket | Allowed | PASS |
| Suspended member reads own notification | Allowed | PASS |
| Reactivated member reads subcollections again | Allowed | PASS |
| Sensitive mission answers limited to user-management admins | Preserved | PASS |
| Recommendation snapshots limited to user-management admins | Preserved | PASS |
| Valid owner recommendation write | Allowed | PASS |
| Invalid schedule/extra fields denied | Denied | PASS |
| Member writes another member recommendation | Denied | PASS |

### Support isolation

| Test | Expected | Result |
|---|---|---|
| Member reads another member ticket | Denied | PASS |
| Member reads internal notes | Denied | PASS |
| Support reads tickets and internal notes | Allowed | PASS |
| Inactive admin denied support access | Denied | PASS |

### Global deny

| Test | Expected | Result |
|---|---|---|
| Unknown collection read/write | Denied | PASS |
| Support manager denied draft content and platform settings | Denied | PASS |

---

## 4. Functional Test Coverage by Feature

### Dashboard

Implemented and type/build checked:

- Loading state.
- Error state.
- Empty platform state.
- Aggregate stat cards including registered, active, suspended, new, workouts, missions, tickets, open tickets, resolved tickets, AI sessions, nutrition.
- Registration trend.
- 7-day activity trend.
- Ticket status breakdown.
- AI exercise mix.
- Recent activity and recent admin activity.
- Bounded-data warning.
- Manual refresh.

Not verified against a populated production dataset. The aggregate query logic and chart rendering are type-checked and built.

### User management

Implemented and type/build checked:

- Server pagination.
- Status filter.
- Registration-period filter.
- Debounced prefix search.
- Exact UID lookup.
- Search cap.
- Loading/error/empty states.
- User detail loading.
- Recent workouts, measurements, mission records, nutrition days, support tickets.
- Suspension reason dialog and validation.
- Reactivation.
- Suspension metadata display.
- Audit entries.
- Existing admin design preserved.

### Content management

Implemented and type/build checked:

- Create/edit/delete workout plans, exercises and nutrition plans through the existing manager.
- Publish/unpublish action.
- Audit logging.
- Member published workout library.
- Member exercise reference.
- Member published nutrition guidance.
- AI plan remains separate.

Full member visibility with live published records requires deployed rules and an authenticated admin/member test account.

### Help Desk

Implemented and type/build checked:

- Server-paginated queue for all/status views.
- Bounded advanced filters.
- Debounced ticket search.
- Loading/error/empty states.
- Ticket detail, replies, internal notes, status, priority, assignment.
- Resolve, close and reopen.
- Admin reply notification and audit.
- Member reply/reopen path preserved.

Full member-to-admin round trip requires two authenticated accounts and deployed rules.

### Announcements

Implemented and type/build checked:

- Create/edit draft.
- Publish.
- Unpublish.
- Delete with confirmation.
- Validation and audit.
- Member Overview banner.

Live cross-account visibility requires deployed rules.

### Audit activity

Implemented and type/build checked:

- Paginated list.
- Action filter.
- Metadata display.
- Immutable records in rules.
- Contact with dashboard recent activity.
- Route/navigation permission.

---

## 5. Security Test Results

- Unauthorized direct Firestore writes were denied in the emulator.
- Admin-only operations were denied to members, support managers and inactive admins where expected.
- Account status cannot be self-elevated or self-suspended.
- Suspension blocks member subcollections while preserving root/support recovery.
- Sensitive mission answers and recommendations remain restricted.
- Draft content and draft announcements are not member-readable.
- Audit records cannot be edited or deleted by any client.
- No privileged credentials were added to frontend code.
- No production rules were deployed during testing.

---

## 6. Failed Tests

**None in the final run.**

During implementation, three earlier rule tests failed because published content became intentionally readable to any signed-in member. Those tests were corrected to assert the actual secure boundary: published content is readable, draft content is denied. The final suite passes 47/47.

---

## 7. Remaining Issues and Blockers

1. **Firestore rules/index deployment** — requires human approval and staging verification.
2. **Admin end-to-end session** — not run with a real administrator because no production credentials were used.
3. **Member/admin Help Desk round trip** — needs two authenticated test accounts and deployed rules.
4. **Content publish → member receive** — code is implemented; live verification needs staging/emulator Auth accounts.
5. **Supabase profile-image function** — unchanged and not tested in Phase 3.
6. **Google OAuth** — unchanged; still requires external Google Cloud Console configuration.
7. **Stale local emulator on the default port** — the test suite was run on an alternate port; this is a local environment issue, not an application failure.
8. **Existing Vite chunk-size warning** — pre-existing; no regression.
9. **Physical mobile and camera** — unchanged AI Coach tested only via earlier Phase 2 work, not re-run here.

---

## 8. Regression Status

Verified unaffected at the source/build level:

- Firebase Authentication provider and sign-in flow.
- Member Dashboard routes.
- Quick Start / mission pages.
- Workout recommendation pages and ONNX model assets.
- AI Coach page (only the previously approved mobile camera-stage sizing change remains).
- Nutrition and progress stores.
- Supabase profile-image code was not modified.
- Existing navigation and public pages.

The production build and model-asset verifier passed after all Phase 3 code changes.

---

## 9. Final Test Verdict

| Area | Verdict |
|---|---|
| TypeScript | PASS |
| Unit tests | PASS |
| Firestore security rules | PASS (47/47) |
| Production build | PASS |
| Model assets | PASS |
| Member browser smoke | PASS |
| Admin UI live-auth E2E | NOT RUN — no credentials |
| Staging rules deployment | PENDING APPROVAL |
| Production data safety | PASS — no production writes |
