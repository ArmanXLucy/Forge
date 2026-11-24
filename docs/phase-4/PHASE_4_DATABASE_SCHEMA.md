# Phase 4 — Database Schema

**Project:** Forge Athletic  
**Collections added:** `ai_monitoring_events` (top-level)  
**Existing collections read:** `users/{uid}/ai_sessions`, `adminUsers/{uid}`  
**Evaluation storage:** static JSON deployment artifact, not Firestore  
**Date:** 25 November 2026

---

## 1. Overview

| Data | Path | Written by | Read by |
| --- | --- | --- | --- |
| Monitoring events | `ai_monitoring_events/{eventId}` | Signed-in member browser | Owner, `super_admin`, `admin` |
| Saved AI Coach sessions | `users/{uid}/ai_sessions/{sessionId}` | Existing AI Coach save path | Owner, AI admins via collection group |
| Admin role | `adminUsers/{uid}` | Existing super-admin flow | Admin access guard |
| Evaluation report | `public/models/evaluation_report.json` | Offline script, deployed with build | Any admin browser |
| Full evaluation detail | `ml/reports/phase4_evaluation.json` | Offline script | Developer/reviewer |

Phase 4 adds exactly one Firestore collection. It does not modify the existing `ai_sessions` document shape, the user profile shape, or any AI model artifact.

---

## 2. `ai_monitoring_events/{eventId}`

### 2.1 Identity

| Property | Value |
| --- | --- |
| Document ID | Client-generated UUID or random fallback. Must equal the `eventId` field. |
| Ownership | `userId` must equal `request.auth.uid`. |
| Timestamp | Firestore `serverTimestamp()`; rules require equality with `request.time`. |
| Schema version | Integer `1`. |
| Mutability | Create and read only for clients. No client updates. Deletes only by `super_admin`. |

### 2.2 Field reference

Required fields are enforced by both the TypeScript writer and `firestore.rules`. Optional fields are only written when defined and non-null.

| Field | Type | Required | Bound / allowed values | Purpose |
| --- | --- | --- | --- | --- |
| `schemaVersion` | number | yes | `1` | Contract version |
| `eventId` | string | yes | Equal to document ID | Idempotent identity |
| `userId` | string | yes | Equal to auth UID | Ownership and affected-member count |
| `appVersion` | string | yes | <= 32 chars | Release correlation |
| `feature` | string | yes | `workout-recommendation`, `ai-coach` | Feature split |
| `eventType` | string | yes | See event catalog | Event semantics |
| `status` | string | yes | `info`, `ok`, `error` | Health classification |
| `createdAt` | timestamp | yes | Server timestamp only | Windows and daily series |
| `sessionRef` | string | no | <= 64 chars | Correlate events within one attempt |
| `modelId` | string | no | <= 64 chars | Model registry correlation |
| `modelVersion` | string | no | <= 40 chars | Deployed version |
| `exercise` | string | no | <= 32 chars | AI Coach exercise key |
| `category` | string | no | <= 120 chars | Predicted plan category |
| `confidence` | number | no | `0..1` | Model confidence |
| `durationMs` | number | no | `0..86,400,000` | Product or inference duration |
| `inferenceMsSum` | number | no | `0..86,400,000` | Sum of scored-window inference time |
| `inferenceCount` | number | no | `0..100,000` | Number of scored windows |
| `goodCount` | number | no | `0..100,000` | Aggregate good-window count |
| `badCount` | number | no | `0..100,000` | Aggregate bad-window count |
| `reps` | number | no | `0..100,000` | Reps in a session |
| `errorCount` | number | no | `0..100,000` | Aggregate error count |
| `errorCategory` | string | error events | See error categories | Failure taxonomy |
| `errorCode` | string | error events | <= 64 chars | Stable machine code |
| `message` | string | no | <= 240 chars, sanitised | Short diagnostic |
| `source` | string | no | `camera`, `video` | AI Coach input source |

No other fields are accepted. `data.keys().hasOnly([...])` in Firestore rules is the final authority.

### 2.3 Event catalog

#### Recommendation events

| Event | Status | Meaning |
| --- | --- | --- |
| `recommendation.requested` | `info` | The member triggered generation; starts a `rec_*` session reference. |
| `recommendation.generated` | `ok` | Model produced a plan; carries category, confidence, duration. |
| `recommendation.failed` | `error` | Generation failed; carries error category/code. |
| `recommendation.saved` | `ok` | Plan persisted to the member account. |
| `recommendation.save_failed` | `error` | Generation succeeded but persistence failed. |

#### Shared model and inference events

| Event | Status | Meaning |
| --- | --- | --- |
| `model.load_started` | `info` | ONNX model or feature schema load began. |
| `model.load_succeeded` | `ok` | Model/schema ready. |
| `model.load_failed` | `error` | Model/schema failed to load. |
| `inference.started` | `info` | Recommendation inference call began. |
| `inference.succeeded` | `ok` | Recommendation inference completed; carries latency. |
| `inference.failed` | `error` | Recommendation or AI Coach score call failed. |
| `validation.passed` | `ok` | Recommendation input contract passed. |
| `validation.failed` | `error` | Recommendation input contract failed. |

#### AI Coach events

| Event | Status | Meaning |
| --- | --- | --- |
| `coach.session.started` | `info` | Camera or video attempt opened; starts a `coach_*` session reference. |
| `coach.session.completed` | `ok` | Member finished the attempt. |
| `coach.session.interrupted` | `info` | Member reset, navigated away, or the attempt closed before finishing. |
| `coach.session.failed` | `error` | Camera/video/model failure prevented the attempt. |
| `coach.session.saved` | `ok` | Saved AI session record created. |

The writer accepts all listed event types for both features, but call sites emit only the combinations documented in [AI Monitoring](./PHASE_4_AI_MONITORING.md).

### 2.4 Status and error invariants

- `status = error` requires both `errorCategory` and `errorCode`.
- `status = info` and `status = ok` must not be counted as failures.
- `errorCategory` is one of `model_load`, `schema_load`, `feature_extraction`, `inference`, `validation`, `persistence`, `camera`, `pose_detection`, `unknown`.
- `errorCode` is a stable short code chosen at the call site, not a raw exception message.
- `message` is optional and sanitised by the writer. Rules enforce the length but cannot verify semantic safety, so the writer is the privacy control.

### 2.5 Example: recommendation generated

```text
schemaVersion: 1
eventId: 8b1c... (UUID)
userId: <firebase uid>
appVersion: 1.0.0
feature: workout-recommendation
eventType: recommendation.generated
status: ok
createdAt: <server timestamp>
sessionRef: rec_9f2c...
modelId: workout_recommendation
modelVersion: 1.0.0
category: Push-Pull-Legs Split (Hypertrophy)
confidence: 1
durationMs: 15
```

### 2.6 Example: AI Coach failed

```text
schemaVersion: 1
eventId: 3e7d... (UUID)
userId: <firebase uid>
appVersion: 1.0.0
feature: ai-coach
eventType: coach.session.failed
status: error
createdAt: <server timestamp>
sessionRef: coach_4ab1...
modelId: form_classifier
modelVersion: 1.0.0
exercise: push_up
source: camera
errorCategory: camera
errorCode: camera-error
message: Camera permission was denied.
```

---

## 3. `users/{uid}/ai_sessions/{sessionId}`

This is an existing Phase 3 collection. Phase 4 only reads it for admin aggregation; the write path and schema are unchanged.

| Field | Type | Admin use |
| --- | --- | --- |
| `exercise` | string | Exercise breakdown |
| `exerciseLabel` | string | Human-readable label |
| `completedAt` | ISO string | Ordering and window filter |
| `durationSeconds` | number | Session duration |
| `reps` | number | Rep totals |
| `scores` | array | Not read by admin aggregation |
| `averageFormScore` | number or null | Average form, only for judged sessions |
| `bestFormScore` | number or null | Best form, only for judged sessions |
| `verdict` | `good`, `needs-work`, `insufficient-data` | Outcome distribution |
| `source` | `camera`, `video` | Source distribution |
| `userId` | string, written at save | Parent UID fallback |

Important: `completedAt` is stored as an ISO **string**, not a Firestore Timestamp. The admin repository therefore performs a bounded, newest-first collection-group read and applies the window in the client. It deliberately does not compare `completedAt` to a Timestamp.

`verdict = insufficient-data` is excluded from form averages and from best-form calculation. A legacy numeric `0` on such a record is treated as absent, not as a measured failure.

---

## 4. Indexes

`firestore.indexes.json` adds five composite indexes for `ai_monitoring_events` and keeps the existing collection-group override for `ai_sessions.completedAt`.

| Collection | Fields | Supports |
| --- | --- | --- |
| `ai_monitoring_events` | `feature ASC, createdAt DESC` | Feature window reads |
| `ai_monitoring_events` | `feature ASC, eventType ASC, createdAt DESC` | Event-type filtering |
| `ai_monitoring_events` | `feature ASC, eventType ASC, exercise ASC, createdAt DESC` | Future exercise-specific event queries |
| `ai_monitoring_events` | `feature ASC, status ASC, createdAt DESC` | Feature error views |
| `ai_monitoring_events` | `status ASC, createdAt DESC` | Global error log |
| `ai_sessions` (collection group) | `completedAt DESC` | Admin saved-session history |

The current queries use the first, second and fifth indexes plus the existing `ai_sessions` override. The other two are forward-compatible but still validated by the emulator test project.

### Index deployment note

The indexes are committed but **not deployed** to the production project because the Firebase CLI has no authorized account in this environment. Queries against production currently fail at the rule layer before index selection. See [Completion Report](./PHASE_4_COMPLETION_REPORT.md).

---

## 5. Evaluation artifact schema

`public/models/evaluation_report.json` is a public, static file. It is not in Firestore and has no security rules. It is safe to expose because it contains only model metadata, aggregate metrics and dataset descriptions.

Top-level shape:

| Field | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | number | Report contract version (`1`) |
| `generatedAt` | ISO string | Offline generation time |
| `generatedBy` | string | `scripts/evaluate-models.py` |
| `official` | boolean | Marks the report as the official evaluation |
| `note` | string | Provenance statement |
| `environment` | object | Python, platform, ONNX Runtime, NumPy, pandas versions |
| `datasets` | object | Dataset descriptions and sizes |
| `models` | array | One entry per deployed ONNX artifact |
| `formDetail` | object | Per-exercise predictions, labels, probabilities |
| `recommendationDetail` | object | Per-class metrics and detail |

Each `models[]` entry includes `id`, `name`, `task`, `feature`, `version`, `fileName`, `sha256`, `sizeBytes`, `threshold`, `dataset`, `metrics`, `baseline`, `reproduction`, `runtime`, and `limitations`.

The full report in `ml/reports/phase4_evaluation.json` additionally contains per-exercise predictions and probabilities for audit. It is not shipped to the browser.

---

## 6. Retention

| Data | Proposed retention | Implemented cleanup |
| --- | --- | --- |
| `ai_monitoring_events` | 90 days | No scheduled job. Deletion is restricted to `super_admin`. |
| `users/{uid}/ai_sessions` | Existing product retention | Not changed by Phase 4. |
| Evaluation report | Life of the release | Regenerated only by script. |

There is no TTL policy and no Cloud Function in this phase. Until a retention job exists, monitoring documents remain until manually deleted by a super admin. This is called out as a remaining task.

---

## 7. Volume and cost characteristics

- A recommendation run emits roughly 4-8 events depending on validation and persistence.
- An AI Coach session emits roughly 4-8 events plus per-score failures, not per-frame events.
- With the 100 events/minute client cap and 25-event queue, a single browser cannot create an unbounded burst.
- Admin reads are bounded to 1,000 / 500 documents per page load.
- Indexes are composite and selective on `feature` and `status`; the collection is expected to remain small relative to workout data.

Do not add per-frame or per-rep monitoring documents. The design intentionally aggregates at the session or inference level.

---

## 8. Rules summary

| Operation | Member owner | `admin` / `super_admin` | Other signed-in | Anonymous |
| --- | --- | --- | --- | --- |
| Create event | Own `userId` only, valid schema | No special create exception | Denied | Denied |
| Get event | Own event | Any event | Denied | Denied |
| List events | Own events only | Any events | Denied | Denied |
| Update event | Denied | Denied | Denied | Denied |
| Delete event | Denied | Denied, except `super_admin` | Denied | Denied |

Full rule analysis is in [Security Report](./PHASE_4_SECURITY_REPORT.md).

---

## 9. Migration and compatibility

- Existing users require no migration.
- Existing `ai_sessions` documents remain readable by the new admin query because the field names already exist.
- Monitoring events are additive and do not affect product reads.
- `schemaVersion: 1` allows a future v2 writer to coexist; rules currently accept only v1.
- If an event is dropped or rejected, no backfill is attempted. Dashboards explicitly describe counts as lower bounds.

---

## 10. Verification

- Rules suite: `npm run test:rules` -> 58 passed, including 11 AI monitoring security tests.
- Aggregation suite: `npx vitest run tests/ai-monitoring.test.ts` -> 7 passed.
- Report integrity suite: `npx vitest run tests/ai-monitoring-report.test.ts` -> 7 passed.
- Emulator admin read verified against locally seeded events and sessions; no production data was modified.

See [Test Report](./PHASE_4_TEST_REPORT.md) for commands and results.