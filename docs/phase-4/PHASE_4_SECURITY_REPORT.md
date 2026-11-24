# Phase 4 — Security Report

**Project:** Forge Athletic  
**Scope:** AI monitoring events, admin monitoring reads, evaluation data integrity, privacy boundaries  
**Rules suite:** 58/58 passed (11 AI monitoring tests)  
**Production deployment:** BLOCKED (Firebase CLI has no authorized account)  
**Date:** 25 November 2026

---

## 1. Executive summary

Phase 4 adds a client-write telemetry collection and three admin read surfaces. The security design has four goals:

1. A member can write only events owned by their own UID, in a fixed schema, with a server timestamp.
2. A member cannot read another member event or list the collection.
3. Only active `admin` and `super_admin` accounts can list monitoring data.
4. Official evaluation metrics cannot be written by any browser.

All four goals are enforced in `firestore.rules` and verified by the emulator suite. The rules and indexes are **not deployed to production**, so the production admin pages currently fail closed with `permission-denied`. This is a deployment blocker, not a rules defect.

---

## 2. Assets and sensitivity

| Asset | Sensitivity | Notes |
| --- | --- | --- |
| Monitoring events | Internal / personal identifier | Contains Firebase UID, aggregate AI behaviour, sanitised errors |
| Saved AI Coach sessions | Personal fitness data | Existing collection; contains exercise, reps, scores |
| Admin role records | Confidential | Existing `adminUsers`; controls access |
| Evaluation report | Public | Model metadata and aggregate metrics; no member data |
| Model artifacts | Public | Already downloaded by browsers |

Monitoring events are not anonymous. They contain a stable UID and a timeline of AI usage. They are treated as internal operational data, not public analytics.

---

## 3. Trust boundaries

| Boundary | Trusted side | Untrusted side |
| --- | --- | --- |
| Member browser -> Firestore | Firestore rules and server timestamps | Browser JS, local storage, network |
| Admin browser -> Firestore | Firestore rules and admin role lookup | Admin browser JS |
| Browser -> static evaluation JSON | Build/deployment pipeline | CDN or static host |
| Offline script -> repository report | Developer machine and code review | Not a runtime boundary |

The browser is never trusted to assert that an event is true. Rules can enforce shape, ownership and time, but they cannot prove that an inference happened.

---

## 4. Attacker capabilities considered

- A signed-in member using browser devtools to call the Firestore SDK directly.
- A member who knows another member UID.
- A suspended member with a still-valid auth token.
- An authenticated non-AI admin (`analyst`, `fitness_manager`, `support_manager`).
- A malicious admin attempting to forge model quality.
- An unauthenticated visitor.
- Accidental leakage through error messages or logs.

Out of scope: compromise of the Firebase project owner account, Google infrastructure, or a malicious repository maintainer with deployment rights.

---

## 5. Controls

### 5.1 Event creation

`allow create` requires all of the following:

| Control | Rule |
| --- | --- |
| Signed in and not suspended | `activeOwner(request.auth.uid)` |
| Owner matches payload | `data.userId == uid` |
| Document ID matches payload | `data.eventId == eventId` |
| Schema version | `data.schemaVersion == 1` |
| Server timestamp | `data.createdAt == request.time` |
| Feature allowlist | `workout-recommendation`, `ai-coach` |
| Event-type allowlist | 18 known event types |
| Status allowlist | `info`, `ok`, `error` |
| Required keys | 8 keys via `hasAll` |
| No unknown keys | 25-key allowlist via `hasOnly` |
| String bounds | `appVersion` 32, `sessionRef` 64, `modelId` 64, `modelVersion` 40, `exercise` 32, `category` 120, `errorCode` 64, `message` 240 |
| Numeric bounds | confidence 0-1; durations/counts 0-86,400,000 or 0-100,000 |
| Error metadata | `status == error` requires `errorCategory` and `errorCode` |

### 5.2 Event reads

| Operation | Allowed |
| --- | --- |
| `get` | Event owner, or any active AI admin |
| `list` | AI admin, or a signed-in member whose query is constrained to their own `userId` |

A member cannot issue an unfiltered collection list. The emulator test confirms that `getDocs(collection(...))` fails for a member, while a `where('userId', '==', 'alice')` query succeeds.

### 5.3 Event mutation

| Operation | Allowed |
| --- | --- |
| `update` | Never, for any client or admin |
| `delete` | `super_admin` only (`canManagePlatform()`) |

Immutability prevents a member from rewriting history and prevents an admin from quietly changing an error count.

### 5.4 Admin access

`canManageAI()` is `hasRole(['super_admin', 'admin'])`. `hasRole()` requires an existing `adminUsers/{uid}` document with `active == true`. The role is read server-side by rules, not from a client claim.

| Role | Monitoring list | Delete |
| --- | --- | --- |
| `super_admin` | Yes | Yes |
| `admin` | Yes | No |
| `fitness_manager` | No | No |
| `support_manager` | No | No |
| `analyst` | No | No |
| Member | Own events only | No |

The UI route guard uses the existing `manage_ai` permission. Rules are the authoritative control; hiding a nav item is not treated as security.

### 5.5 Evaluation integrity

There is no `model_evaluations` collection in the rules. A write to it falls through to the global deny. Both an `admin` and a `super_admin` were tested and rejected.

The official report is generated offline and shipped as a static file. An admin browser can read it but cannot write it. This is the correct trust model for a metric that drives model-quality claims.

### 5.6 Privacy controls

- Event allowlist excludes answers, goals, injuries, free text, media, landmarks, names and emails.
- The writer sanitises URLs, emails and token-like strings before enqueue.
- The writer truncates messages at 240 characters.
- Admin pages never render raw JSON; they render selected fields through React escaping.
- No camera footage or raw pose is uploaded for monitoring.
- No stack traces are stored.

---

## 6. Rule test results

Command: `npm run test:rules`  
Result: **58 passed (58)**

### AI monitoring tests

| # | Test | Result |
| --- | --- | --- |
| 1 | Member creates a schema-valid event for self | Pass |
| 2 | Member creates a failure event with category and code | Pass |
| 3 | Creating on behalf of another member is denied | Pass |
| 4 | Suspended member write is denied | Pass |
| 5 | Mismatched eventId, unknown fields, out-of-range confidence, oversized appVersion, invalid feature are denied | Pass |
| 6 | Client timestamp and missing error metadata are denied | Pass |
| 7 | Owner can read own event, cannot read another member event | Pass |
| 8 | Member can list only own events | Pass |
| 9 | AI admins can list all; analyst and fitness manager cannot | Pass |
| 10 | No client can update; admin cannot delete; super admin can delete | Pass |
| 11 | Evaluation collection writes are denied for admin and super admin | Pass |

The suite also contains the existing 47 Phase 1-3 tests. No existing test regressed.

---

## 7. Residual risks

| Risk | Severity | Status / rationale |
| --- | --- | --- |
| Rules not deployed to production | **High** | Telemetry writes and admin reads fail closed. Deployment is blocked by missing CLI auth. |
| Client-reported telemetry can be forged by its own UID | Medium | Rules cannot prove an inference occurred. Accepted for operational monitoring; not an audit ledger. |
| Event type and status are not cross-validated | Low | A forged event could pair an unusual type/status. It still needs a valid owner and schema. Add pairing rules if abuse appears. |
| No App Check | Medium | A signed-in attacker can script writes up to the client-side cap. Firestore rules cap shape, not request rate. |
| No server-side rate limit | Medium | The 100/minute cap is client-side and bypassable. Requires App Check, Functions, or quota policy. |
| No automated retention or account-deletion cascade | Medium | Top-level events are not deleted when a member account is removed. A retention/deletion job is required before production scale. |
| UID visible to admins | Low | Operational identifier, no name/email. Access is role-gated. |
| Sanitiser is heuristic | Low | It removes common URL/email/token patterns, not every possible sensitive string. Call sites are constrained to stable error messages. |
| Admin pages can be capped | Low | UI discloses the cap; an attacker cannot use it to hide a specific event except by flooding newer events. |
| Static report is public | Low | Contains no member data. It could be scraped, which is acceptable. |

---

## 8. Deployment requirements

Before production use:

1. Authenticate the Firebase CLI (`firebase login`).
2. Deploy rules: `firebase deploy --only firestore:rules --project forge-11cbf`.
3. Deploy indexes: `firebase deploy --only firestore:indexes --project forge-11cbf`.
4. Wait for composite indexes to finish building.
5. Verify a member write succeeds and an admin list succeeds.
6. Verify a non-AI admin is denied.
7. Verify an anonymous user is denied.
8. Decide and implement a retention policy before volume grows.

Until steps 1-4 are complete, the production admin pages will continue to show `permission-denied`. The code is correct but the cloud policy is stale.

---

## 9. Verification evidence

| Evidence | Result |
| --- | --- |
| TypeScript compile | Exit 0 |
| Production build | Exit 0 |
| Rules tests | 58/58 passed |
| AI monitoring unit tests | 7/7 passed |
| Report integrity tests | 7/7 passed |
| Emulator admin read with seeded data | Passed for all three pages |
| Production admin read | Failed `permission-denied` (expected until deploy) |
| Production member monitoring write | Not verifiable without deployed rules; product generation still worked |

---

## 10. Related documents

- [Architecture](./PHASE_4_ARCHITECTURE.md)
- [Database Schema](./PHASE_4_DATABASE_SCHEMA.md)
- [AI Monitoring](./PHASE_4_AI_MONITORING.md)
- [Test Report](./PHASE_4_TEST_REPORT.md)
- [Completion Report](./PHASE_4_COMPLETION_REPORT.md)