# Phase 4 — Completion Report

**Project:** Forge Athletic (`F:\Fitness Coach`)  
**Phase:** 4 — AI Monitoring, Evaluation and Reliability  
**Date:** 25 November 2026  
**Overall status:** **PARTIALLY COMPLETED**  
**Blocking item:** Firestore rules and indexes are committed but not deployed to production, because the Firebase CLI has no authorized account.

---

## 1. Executive summary

Phase 4 delivered the full monitoring, evaluation and error-visibility implementation in source:

- A fire-and-forget AI telemetry pipeline for workout recommendation and AI Coach.
- Real-data aggregation for the two existing AI admin pages.
- A new AI Error Log admin page.
- An offline, reproducible evaluation of all four deployed ONNX artifacts.
- Firestore rules and indexes for the new collection.
- 79 unit/integration tests and 58 rules tests, all passing.
- Eight Phase 4 documents, including this report.

The work is not fully live. Production Firestore still runs the previous rules, so monitoring writes and admin reads are denied. The admin pages were verified end-to-end against local Firebase emulators with seeded records. No production monitoring data has been observed or verified, and production admin visibility could not be verified.

No AI model was retrained, replaced, re-exported, or tuned. No threshold changed. No paid API, server-side inference, or camera/pose persistence was introduced.

---

## 2. What existed before Phase 4

### Member-facing AI

- Browser-side workout recommendation using ONNX Runtime Web and a 24-class plan classifier.
- Browser-side AI Coach using MediaPipe Pose Landmarker and three exercise-specific ONNX form classifiers.
- Rep counting, form scores, session verdicts, and saved `ai_sessions` records.
- Camera and video input with local-only inference.

### Admin portal

- Admin authentication, roles, permissions, and `manage_ai` route guards.
- Existing Model Monitoring and AI Coach Monitoring pages with placeholder or partially wired content.
- Existing admin visual system (charcoal/ivory/orange, panels, stat cards, Recharts).

### Data and evaluation

- `users/{uid}/ai_sessions` with exercise, reps, scores, average/best form, verdict, source.
- ONNX artifacts in `public/models/` and model metadata.
- Historical form metrics in `ml/reports/final_metrics.json`.
- No AI telemetry collection.
- No error log.
- No official deployed-artifact evaluation report.
- No reproducible evaluation script with hash checks.

The full Stage One audit is in [PHASE_4_AUDIT_REPORT.md](./PHASE_4_AUDIT_REPORT.md).

---

## 3. What was added

### 3.1 Telemetry

- `trackAIEvent()` writer with allowlists, sanitisation, dedupe, rate limit, queue and debounced flush.
- 18 event types covering recommendation, model load, inference, validation, persistence and AI Coach lifecycle.
- Session correlation through `rec_*` and `coach_*` references.
- Server timestamps and a strict 25-field allowlist enforced by Firestore rules.

### 3.2 Recommendation monitoring

- Emission at model load, schema load, inference, validation, generation and save.
- Admin metrics for plans generated, generation success, members, latency, errors, categories and daily volume.
- Failure panels for inference, model load and persistence.

### 3.3 AI Coach monitoring

- Emission for session start, model load, terminal state, per-window inference failure and save.
- Admin metrics for saved sessions, members, reps, average form, completion and failure rates.
- Lifecycle counters, exercise starts, verdict distribution, latency, failure signals and a filterable session table.

### 3.4 Error visibility

- New `/admin/ai-errors` page with feature/category filters, five stats, category bars, daily chart, paginated table and retention notes.
- Shared bounded error query and friendly permission/index messages.

### 3.5 Evaluation

- `scripts/evaluate-models.py` runs the deployed ONNX files offline.
- SHA-256 and byte size pinned for all four artifacts.
- Form metrics on 24 held-out clips per exercise; recommendation metrics on 1,427 synthetic test rows.
- Artifact drift distinguished from regression.
- `--check` mode for CI/review reproducibility.

### 3.6 Admin integration

- Existing Model Monitoring and AI Coach Monitoring pages rebuilt on real stored events and saved sessions.
- New static evaluation table and artifact registry.
- Shared range, pill and scope-notice components.
- Explicit absent-vs-zero handling and cap notices.

---

## 4. Files

### 4.1 Created

| File | Purpose |
| --- | --- |
| `src/features/ai-monitoring/types.ts` | Event contract, feature/status/error types, allowlists |
| `src/features/ai-monitoring/records.ts` | Admin read-model types and Firestore value coercion |
| `src/features/ai-monitoring/aggregate.ts` | Pure summaries, ratios, UTC daily series, latency |
| `src/features/ai-monitoring/useAIMonitoring.ts` | Bounded feature event hook |
| `src/features/ai-monitoring/useAIErrors.ts` | Bounded error event hook |
| `src/services/monitoring/aiMonitoring.ts` | Fire-and-forget writer, sanitisation, queue, rate limit |
| `src/services/cloud/aiMonitoringRepository.ts` | Bounded admin queries and parsing |
| `src/features/admin/useAIEvaluation.ts` | Static report loader and artifact checks |
| `src/features/admin/useAdminAISessions.ts` | Saved AI session hook |
| `src/components/admin/monitoring.tsx` | Range control, pills, scope notice |
| `src/pages/Admin/AIErrorLogPage.tsx` | New error log page |
| `scripts/evaluate-models.py` | Offline ONNX evaluation |
| `public/models/evaluation_report.json` | Official browser-readable report |
| `ml/reports/phase4_evaluation.json` | Full evaluation detail and predictions |
| `tests/ai-monitoring.test.ts` | 7 aggregation tests |
| `tests/ai-monitoring-report.test.ts` | 3 sanitisation + 4 report integrity tests |
| `docs/phase-4/PHASE_4_AUDIT_REPORT.md` | Stage One audit |
| `docs/phase-4/PHASE_4_ARCHITECTURE.md` | Architecture |
| `docs/phase-4/PHASE_4_DATABASE_SCHEMA.md` | Data contract and indexes |
| `docs/phase-4/PHASE_4_AI_MONITORING.md` | Monitoring operations and metric definitions |
| `docs/phase-4/PHASE_4_MODEL_EVALUATION.md` | Evaluation methodology and results |
| `docs/phase-4/PHASE_4_SECURITY_REPORT.md` | Threat model and rules evidence |
| `docs/phase-4/PHASE_4_TEST_REPORT.md` | Test evidence |
| `docs/phase-4/PHASE_4_COMPLETION_REPORT.md` | This report |

### 4.2 Modified

| File | Change |
| --- | --- |
| `src/features/workout-recommendation/lib/inference.ts` | Model load and inference telemetry |
| `src/features/workout-recommendation/lib/recommendationService.ts` | Request, validation, generation, failure telemetry |
| `src/store/useRecommendationStore.ts` | Save success/failure telemetry |
| `src/pages/Dashboard/AICoachPage.tsx` | Session lifecycle, model load, score failure, save telemetry; cleanup closes interrupted attempt |
| `src/pages/Admin/AIMonitoringPage.tsx` | Rebuilt on real recommendation events + static evaluation |
| `src/pages/Admin/AICoachMonitoringPage.tsx` | Rebuilt on real coach events + saved sessions |
| `src/components/navigation/adminNav.ts` | Added AI Error Log item |
| `src/App.tsx` | Lazy error-log route under `manage_ai` |
| `firestore.rules` | AI event validation and access rules |
| `firestore.indexes.json` | Five monitoring indexes; session collection-group override |
| `tests/firestore.rules.test.ts` | 11 AI monitoring security tests |
| `package.json` | Evaluation scripts with Windows venv path |

---

## 5. Database changes

### Added collection

`ai_monitoring_events/{eventId}` with 25 allowed fields. Full contract in [Database Schema](./PHASE_4_DATABASE_SCHEMA.md).

Key properties:

- Top-level collection, not a member subcollection.
- Client-generated document ID equal to `eventId`.
- `userId` must equal the authenticated UID.
- `createdAt` must be a Firestore server timestamp.
- Immutable after create.
- No answers, media, landmarks, free text, email, or member goals.

### Existing collection read

`users/{uid}/ai_sessions` is read through a collection group for admin saved-session metrics. Its schema and write path were not changed.

### Indexes added

- `feature ASC, createdAt DESC`
- `feature ASC, eventType ASC, createdAt DESC`
- `feature ASC, eventType ASC, exercise ASC, createdAt DESC`
- `feature ASC, status ASC, createdAt DESC`
- `status ASC, createdAt DESC`
- Collection-group `ai_sessions.completedAt DESC`

The indexes are committed but not deployed.

---

## 6. Security rule changes

### New helpers

- `canManageAI()` -> active `super_admin` or `admin`.
- `validAIMonitoringEvent(eventId, uid)` -> ownership, schema version, server time, allowlists, field bounds, required error metadata.

### Access matrix

| Operation | Member | AI admin | Other admin | Anonymous |
| --- | --- | --- | --- | --- |
| Create own event | Yes, if valid and not suspended | No special case | No | No |
| Read own event | Yes | Yes | No | No |
| List own events | Yes, with owner filter | Yes, all | No | No |
| Update event | No | No | No | No |
| Delete event | No | No | `super_admin` only | No |

No evaluation collection was added. Official metrics remain a static deployment artifact and cannot be written by any client.

### Deployment status

**BLOCKED.** `firebase login:list` reports `No authorized accounts`. The production project still runs the previous rules, which is why the admin pages return `permission-denied`.

Required commands once authenticated:

```powershell
firebase deploy --only firestore:rules --project forge-11cbf
firebase deploy --only firestore:indexes --project forge-11cbf
```

---

## 7. Evaluation results

### Form classifiers (24 held-out clips each)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC | False accept | False reject |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Squat | 0.5417 | 0.6667 | 0.1667 | 0.2667 | 0.7292 | 0.0833 | 0.8333 |
| Bicep curl | 0.4167 | 0.2500 | 0.0833 | 0.1250 | 0.3681 | 0.2500 | 0.9167 |
| Push-up | 0.6667 | 0.6667 | 0.6667 | 0.6667 | 0.7222 | 0.3333 | 0.3333 |

Confusion matrices:

| Model | TN | FP | FN | TP |
| --- | --- | --- | --- | --- |
| Squat | 11 | 1 | 10 | 2 |
| Bicep curl | 9 | 3 | 11 | 1 |
| Push-up | 8 | 4 | 4 | 8 |

Interpretation: squat is very conservative and rejects most good clips; bicep curl is below chance on this test split (ROC-AUC 0.3681); push-up is balanced but the sample is small. These are real weaknesses of the unchanged models and are reported without tuning.

### Recommendation classifier

| Metric | Value |
| --- | --- |
| Test samples | 1,427 |
| Classes | 24 |
| Accuracy | 1.0000 |
| Macro F1 | 1.0000 |
| Weighted F1 | 1.0000 |
| Reproduction | `exact` |

This is a **synthetic ceiling**. It proves exact reproduction of a deterministic synthetic mapping, not real-athlete plan quality. The dashboard and report label it accordingly.

### Artifact drift

Form classifiers report `artifact-drift`: the deployed ONNX files were refit on training + validation after the stored baseline was measured on a training-only model. Historical stored metrics are therefore not reproducible from the shipped files. The UI shows deployed metrics and the delta with this explanation.

### Artifact hashes

| Model | SHA-256 prefix | Size |
| --- | --- | --- |
| Recommendation | `cf256da022384875…` | 1,617,299 B |
| Squat | `84a84bc130159a40…` | 373,668 B |
| Bicep curl | `23bfeb8495b9e942…` | 373,780 B |
| Push-up | `18fb7cde7ac4d747…` | 340,970 B |

---

## 8. Tests and verification

| Check | Result |
| --- | --- |
| `npm test` | 5 files passed, 1 skipped; **79 passed, 58 skipped** |
| `npm run test:rules` | **58 passed (58)**, including 11 Phase 4 tests |
| `npx tsc --noEmit` | Exit 0 |
| `npm run build` | Exit 0; model assets verified |
| `npm run eval:models:check` | `CHECK OK` |
| Manual emulator admin E2E | All three pages passed |
| Production admin read | Blocked by undeployed rules |

Manual E2E used local Auth and Firestore emulators, a real email/password account, seeded test events and sessions, and the actual Vite app. It confirmed the pages render stored data, filters, pagination, caps, empty states and `—` for unscored sessions. The seeded numbers are test fixtures, not production metrics.

---

## 9. Limitations

1. **Production rules/indexes not deployed** — the primary blocker; monitoring is fail-closed in production.
2. **No production monitoring data observed** — the pages cannot be evaluated against real traffic yet.
3. **Lossy telemetry** — no retry, backfill, delivery guarantee, or drop-rate measurement.
4. **Client-reported events** — rules enforce shape and ownership, not truth; a signed-in client can forge plausible events for itself.
5. **No App Check or server-side rate limit** — abuse resistance is limited.
6. **No retention automation** — no TTL or scheduled cleanup; account deletion does not cascade to top-level events.
7. **No alerting** — an admin must open the error log.
8. **Bounded windows** — 1,000 events / 500 sessions; older data is excluded and disclosed.
9. **UID-only admin tables** — no member profile join.
10. **Small form test set** — 24 clips per exercise; confidence intervals are wide.
11. **Synthetic recommendation evaluation** — 1.0000 is not real-world generalisation.
12. **Artifact drift** — historical form baselines are not reproducible from the shipped refit models.
13. **Offline CPU timing** — not comparable to browser WASM latency.
14. **No accessibility or visual regression suite** for the new admin surfaces.
15. **Manual E2E only** — no committed browser test.

---

## 10. Remaining tasks

### P0 — unblock production

1. Authenticate Firebase CLI.
2. Deploy `firestore.rules` and `firestore.indexes.json`.
3. Wait for indexes to build.
4. Verify a member monitoring write succeeds.
5. Verify all three admin pages read production data.
6. Verify a non-AI admin is denied.
7. Capture production evidence and update this report.

### P1 — operational hardening

8. Add App Check or an equivalent abuse control.
9. Add a retention policy (for example 90 days) and an account-deletion cascade.
10. Add automated alerting for a failure-rate threshold.
11. Add a server-side or rules-adjacent rate limit if abuse is observed.

### P2 — quality and coverage

12. Expand the form test set beyond 24 clips and report confidence intervals.
13. Evaluate video-level tracking stability.
14. Add a real-world recommendation validation study with coach review.
15. Add committed browser E2E and accessibility checks.
16. Decide whether to retrain weak form classifiers; this requires explicit approval and is outside Phase 4.

---

## 11. Status by deliverable

| Deliverable | Status | Evidence |
| --- | --- | --- |
| Stage One audit | **COMPLETED** | `PHASE_4_AUDIT_REPORT.md` |
| Monitoring architecture | **COMPLETED** | `PHASE_4_ARCHITECTURE.md` |
| Workout recommendation monitoring | **PARTIALLY COMPLETED** | Code and emulator verification done; no production data |
| AI Coach monitoring | **PARTIALLY COMPLETED** | Code and emulator verification done; no production data |
| Model evaluation | **COMPLETED** | Offline report, hashes, `CHECK OK` |
| Admin Model Monitoring on real data | **PARTIALLY COMPLETED** | Real queries; production blocked |
| Admin AI Coach Monitoring on real data | **PARTIALLY COMPLETED** | Real queries; production blocked |
| Admin AI Error Log | **PARTIALLY COMPLETED** | New page; production blocked |
| Error tracking | **PARTIALLY COMPLETED** | Sanitised event pipeline; no alerting |
| Firestore rules | **BLOCKED** | Implemented and 58/58 rules tests pass; production deployment blocked |
| Firestore indexes | **BLOCKED** | Implemented in `firestore.indexes.json`; production deployment blocked |
| Testing | **PARTIALLY COMPLETED** | Executable suite complete; production E2E blocked |
| Phase 4 documentation | **COMPLETED** | Eight documents in `docs/phase-4/` |
| Production deployment | **BLOCKED** | No Firebase CLI authorization |

### Overall

**PARTIALLY COMPLETED**

The implementation is complete and verified locally. Production is not live because the cloud rules and indexes could not be deployed. Until that changes, no production AI monitoring data will be collected and the production admin pages will continue to fail closed.

---

## 12. Phase 4 document index

1. [Audit Report](./PHASE_4_AUDIT_REPORT.md)
2. [Architecture](./PHASE_4_ARCHITECTURE.md)
3. [Database Schema](./PHASE_4_DATABASE_SCHEMA.md)
4. [AI Monitoring](./PHASE_4_AI_MONITORING.md)
5. [Model Evaluation](./PHASE_4_MODEL_EVALUATION.md)
6. [Security Report](./PHASE_4_SECURITY_REPORT.md)
7. [Test Report](./PHASE_4_TEST_REPORT.md)
8. [Completion Report](./PHASE_4_COMPLETION_REPORT.md)