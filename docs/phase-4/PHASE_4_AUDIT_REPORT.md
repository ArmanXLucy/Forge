# Phase 4 — AI Monitoring, Evaluation & Reliability
## Stage One Audit Report

**Project:** Forge Athletic (`F:\Fitness Coach`)**  
**Phase:** 4 — AI Monitoring, Evaluation & Reliability  
**Audit date:** 2026-11-25  
**Status of this document:** Stage One baseline audit. It describes the system as found, before any Phase 4 change.  
**Constraint honoured:** no AI model was retrained, replaced or exported during this audit. The four ONNX artifacts and their metadata were only read and hashed.

---

## 1. Audit scope and method

The audit covered every layer that participates in an AI feature or in AI administration:

| Area | Evidence inspected |
| --- | --- |
| AI assets | `public/models/*`, `ml/`, `workout-recommendation/artifacts`, `ml/reports/*` |
| Workout recommendation flow | `src/features/workout-recommendation/**`, `src/store/useRecommendationStore.ts`, `src/pages/Dashboard/WorkoutRecommendationPage.tsx` |
| AI Coach flow | `src/pages/Dashboard/AICoachPage.tsx`, `src/features/ai-coach/**`, `src/types/activity.ts`, `src/store/useActivityStore.ts` |
| Persistence | `src/services/cloud/firestoreRepository.ts`, `src/services/cloud/adminRepository.ts`, `firestore.rules`, `firestore.indexes.json` |
| Admin AI surfaces | `src/pages/Admin/AIMonitoringPage.tsx`, `src/pages/Admin/AICoachMonitoringPage.tsx`, `src/features/admin/useAdminSnapshot.ts`, `src/features/admin/useModelMetadata.ts` |
| Access control | `src/features/admin/useAdminAccess.ts`, `src/features/admin/access.ts`, `src/components/layout/AdminRouteGuard.tsx`, `src/components/navigation/adminNav.ts`, `src/App.tsx` |
| Evaluation evidence | `ml/reports/summary.json`, `ml/reports/final_metrics.json`, `ml/reports/splits.json`, `workout-recommendation/artifacts/training_results.json`, `workout-recommendation/reports/*.md` |
| Tests | `tests/firestore.rules.test.ts`, `tests/model-assets.test.ts`, `package.json` scripts |

Method: static code tracing from user action to Firestore document, rules review, artifact inspection, and execution of the existing type-check/test/build toolchain where available. No production metric was inferred from UI text.

---

## 2. What already existed

### 2.1 Application stack

- React 18.3 + Vite 6 + TypeScript (strict), Tailwind, Zustand, React Router 6, Recharts, Sonner.
- Firebase Auth + Firestore (client SDK 11.x), with an optional Supabase Edge Function used only for profile-image upload.
- Browser-only inference: ONNX Runtime Web (recommendation model 1.31.1 from the pinned jsDelivr CDN; AI Coach 1.19.2 plus MediaPipe Tasks Vision 0.10.14). No dedicated inference server, no paid inference API.
- Deployment assets are served from `public/models/`. `npm run model:assets` copies verified artifacts from `ml/` / `workout-recommendation/`; `scripts/verify-model-assets.mjs` checks them.

### 2.2 AI features

**Workout recommendation**

- `src/features/workout-recommendation/lib/inference.ts` loads `/models/workout_recommendation.onnx` and `/models/feature_schema.json`, validates the 9 model inputs, runs a single ONNX inference and returns `{ label, confidence, probabilities, inferenceMs, modelVersion }`.
- `recommendationService.ts` maps the predicted category to a plan template, validates the generated schedule, and writes through `recommendationRepository.ts` to `users/{uid}/workout_recommendations` (plus `mission_answers`).
- The model is a 24-class synthetic-data classifier. It has no notion of a live session, no latency telemetry, no probability drift record and no failed-inference record. `inferenceMs` is stored on the recommendation document but is not aggregated anywhere in admin.
- Errors are typed (`model-unavailable`, `invalid-input`, `inference-failed`, `schema-unavailable`) and surfaced in the member UI. They are not reported anywhere else.

**AI Coach**

- `src/pages/Dashboard/AICoachPage.tsx` (1,064 lines) manages camera/video input, MediaPipe pose detection, rep counting, periodic scoring every ~1.8 s, cue generation, and explicit session save.
- Sessions are saved only when the member presses Save: `addAISession` writes locally and calls `saveAISession(uid, record)` into `users/{uid}/ai_sessions`. A session with zero model scores cannot be saved.
- `AISessionRecord` contains exercise, duration, reps, per-window scores, average/best form score, verdict and source. It contains no video, no landmarks and no per-frame pose data.
- There is no record of sessions that were started and abandoned, sessions that failed model loading, inference failures, or camera/pose failures. There is no inference-latency aggregate.

### 2.3 Model artifacts (hashes as found)

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `public/models/workout_recommendation.onnx` | 1,617,299 | `cf256da0223848750cb25198d3d57da0ebcacc56636a4fdf90ff6c76b3c3c2a7` |
| `public/models/form_classifier_squat.onnx` | 373,668 | `84a84bc130159a403765be9d44d72f87af46e6e19bf74e193694cf7cefe6aa97` |
| `public/models/form_classifier_bicep_curl.onnx` | 373,780 | `23bfeb8495b9e942059c862d41ea6929b17fe6a87b44ffbe044a2e3927110d44` |
| `public/models/form_classifier_push_up.onnx` | 340,970 | `18fb7cde7ac4d747d02dbfed87e6cff76e06efa8b78bebcb8aa963b81cece0e7` |

Form-classifier metadata declares version `1.0.0`, class order `[BAD, GOOD]`, 60 engineered clip features, pose source `pose_landmarker_full.task`, and thresholds `squat 0.66`, `bicep_curl 0.64`, `push_up 0.58`. The recommendation schema declares classes for 24 workout categories and model version `1.0.0`.

### 2.4 Admin AI surfaces

- `/admin/ai-monitoring` — Model Monitoring. Header, five stat cards, classifier availability, metadata/thresholds, sessions-by-exercise bar chart, verdict pie chart and a recent-session table.
- `/admin/ai-coach-monitoring` — AI Coach Monitoring. Session stats, per-exercise counts, averages and a session table, all derived from the same admin snapshot.
- Both routes are lazy-loaded and protected by `RequireAdminPermission permission="manage_ai"`.
- Navigation already groups both pages under **AI management**.

### 2.5 Evaluation assets that exist

- `ml/reports/summary.json`: 444 videos, 25–26 participants, 22,662 windows, 291 raw features, window length 2.0 s / stride 0.5 s, mean pose-detection rate 0.9831.
- `ml/reports/final_metrics.json`: participant-independent test split `001, 009, 017, 024`; stored test metrics and confusion matrices.
- `ml/reports/clip_features.parquet` (444 rows × 56 columns) and `ml/reports/rep_features.parquet` (444 rows × 21 columns): clip-level features that reconstruct the 60 features the shipped form models consume.
- `workout-recommendation/artifacts/training_results.json`: full 24-class test report (1,427 samples, confusion matrix, per-class metrics) plus ONNX parity validation.
- Narrative reports under `workout-recommendation/reports/` and `docs/PHASE_2_AI_PERFORMANCE_REPORT.md`.

**Important gap:** the original raw videos and the exact window dataset (`ml/dataset/`) are not present in the repository. Stored reports therefore cannot be regenerated from raw footage here. However, the shipped form ONNX models *can* be re-evaluated on the stored clip features for the recorded held-out participants — that is a genuine, reproducible evaluation of the deployed artifacts, and it was chosen for Phase 4.

### 2.6 Existing evaluation numbers (as stored, before Phase 4)

| Exercise | Test n | Accuracy | Precision | Recall | F1 | ROC AUC | False accept (BAD→GOOD) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Squat | 24 | 0.5000 | 0.5000 | 0.1667 | 0.2500 | 0.6528 | 0.1667 |
| Bicep curl | 24 | 0.5000 | 0.5000 | 0.0833 | 0.1429 | 0.4306 | 0.0833 |
| Push-up | 24 | 0.6250 | 0.6364 | 0.5833 | 0.6087 | 0.7361 | 0.3333 |

Recommendation model stored test report: 1,427 samples, accuracy/macro-F1 1.0000 on a synthetic dataset designed to be deterministic. This is a **synthetic-data ceiling, not real-athlete generalisation**, and the existing report says so.

---

## 3. Current data flows

### 3.1 Recommendation generation

```
Member clicks Generate
  -> useRecommendationStore.generate
  -> createRecommendation (recommendationService)
  -> dynamic import inference.ts
  -> getSession() + loadFeatureSchema()   [cached promises]
  -> validate(ModelInput)
  -> session.run(feed)                     [browser WASM]
  -> PredictionResult (label, confidence, inferenceMs)
  -> generateWorkoutPlan + validator
  -> deactivate old plans + persist plan   [users/{uid}/workout_recommendations]
  -> local plan state
```

Observability today: only the generated plan document. There is no requested/started/succeeded/failed event, no model-load timing, no validation outcome, no save-failure event, no app version.

### 3.2 AI Coach session

```
Member opens /dashboard/ai-coach
  -> start camera or load video
  -> loadAIClient() (metadata + 3 ONNX sessions) and loadPoseLandmarker()
  -> MediaPipe detectForVideo each animation frame
  -> sample pose every 100 ms, score at most every 1.8 s (last 180 frames)
  -> member presses Finish, then Save
  -> AISessionRecord persisted to users/{uid}/ai_sessions
```

Observability today: only the saved session record. A member who abandons the page, denies camera access, or hits a model-load error leaves no operational trace. Scored windows are aggregated into session min/mean/max-like values in the UI but the good/bad distribution is not stored on the session record (only the verdict and score array).

### 3.3 Admin monitoring reads

`useAdminSnapshot()` calls `getAdminSnapshot()`, which issues several collection-group queries with hard limits: users 500, workouts 2,000, missions 2,000, `ai_sessions` 2,000, tickets, messages, nutrition logs. Both AI pages consume that one snapshot. Consequences:

- The pages cannot show anything the snapshot does not contain (no inference jobs, no failures, no latency, no evaluation).
- Read cost grows with total platform activity and is paid on every admin visit.
- The page labels latency as *Unavailable — not collected by the client*, which is truthful today.

---

## 4. Gap analysis against Phase 4 requirements

| Requirement | Baseline state | Gap |
| --- | --- | --- |
| Model monitoring | Availability + saved-session aggregate only | No inference counts, latency, success rate, model version activity, deployment state |
| Workout recommendation monitoring | Plan document only | No request/model-load/inference/validation/save lifecycle |
| AI Coach monitoring | Saved sessions only | No started/abandoned/failed sessions, no model-load failures, no classification distribution per session |
| Model evaluation | Narrative + stored JSON reports | No executable harness against shipped ONNX, no machine-readable evaluation artifact consumed by admin |
| Admin model page | Static summary | No filters, no real inference/error metrics, no evaluation display, no bounded queries |
| Admin AI Coach page | Snapshot list | No status/exercise/date filters, no pagination, no failure visibility, no model-version breakdown |
| Error tracking | None | No error events, categories, dedupe, dashboard or recent-error list |
| Security | `ai_sessions` readable by any admin; no monitoring collections | No event schema rules, no bounds on event writes, no explicit block on forged evaluation/registry writes |
| Reliability | AI works independently of monitoring by accident (there is no monitoring) | No guarantees for non-blocking, bounded buffering, offline tolerance, or failure isolation |
| Testing | 28 KB rules suite + model-asset tests | No monitoring-rules tests, no evaluation regression test, no dashboard data tests |

---

## 5. Security findings

1. **No monitoring write surface exists.** Nothing today lets a client write an inference event, so there is also no rule validating one. Adding such a collection without strict shape/ownership validation would create a spam and data-poisoning surface.
2. **No trusted evaluation surface exists.** Evaluation numbers live in repo JSON and narrative docs. Admin UI does not read them. There is nothing for a member to tamper with today, and Phase 4 must keep it that way: evaluation artifacts must be produced by a controlled offline process, never accepted from a browser.
3. **`ai_sessions` collection-group reads are admin-wide.** Rules allow `isAdmin()` for `{path=**}/ai_sessions`. This is acceptable for member session summaries, but monitoring events will contain different data and must not be readable by ordinary members or by admins without the AI permission.
4. **Member data is owner-scoped.** `users/{uid}/...` is owner-readable and owner-writable except `mission_answers` and `workout_recommendations`; admin reads are role-gated. Any new top-level collection must replicate this ownership check.
5. **Existing admin permission model is client-enforced for UI, role-enforced in rules.** `manage_ai` is a UI permission granted to `super_admin` and `admin`; rules currently use role helpers (`canManageUsers`, `canSupport`, `canViewAnalytics`, `canManagePlatform`). A new `canManageAI()` helper must be added; it must not accept a client-supplied role.
6. **No endpoint accepts arbitrary metrics as official.** Good baseline property to preserve: official model performance will come from a build-time artifact generated by the evaluation script, not from Firestore.

---

## 6. Reliability findings

- **AI must not depend on monitoring.** Today it does not; the risk is introduced by Phase 4. Every monitoring call must be fire-and-forget, time-boxed and failure-swallowed. No monitoring write may sit in the critical path of a prediction or a session save.
- **Cached loaders.** `inference.ts` caches `sessionPromise` / `schemaPromise`; `modelClient.ts` caches `clientPromise` / `posePromise`. A failed load resets the relevant promise and retries. Monitoring must observe the retry, not change it.
- **Offline/local mode.** Activity is mirrored locally and cloud writes are optional. Monitoring must respect the same switch and no-op when cloud is unavailable.
- **Session identity.** AI Coach sessions currently have no ID until save. Monitoring needs a per-attempt reference that survives a failure and is not derived from PII.
- **No retention policy.** Any new event collection needs bounded querying, documented retention and admin-only deletion; otherwise cost grows forever.

---

## 7. Privacy findings

- No camera frames, video blobs or pose landmarks are persisted anywhere today. Session records store derived scores and measured angles only.
- `ScoreResult.features` and raw `PoseFrame` arrays are never written to Firestore. This must remain true.
- Monitoring must never include: answers, free-text notes, email, display name, image/video URLs, landmarks, model inputs, or raw error stacks that may embed paths/URLs.
- Allowed identifiers: Firebase uid, random session reference, exercise key, model/version, event type, durations, counts, confidence, predicted category, sanitised error code/category and a short sanitised message.

---

## 8. What Phase 4 will add (planned, evidence-based)

1. A typed, versioned, fire-and-forget monitoring client for `workout-recommendation` and `ai-coach`, writing bounded events to a top-level `ai_monitoring_events` collection with owner-only writes and AI-admin reads.
2. Lifecycle instrumentation for recommendation: requested, model load start/success/failure, inference start/success/failure, validation pass/fail, generated, saved, save failure; plus duration, category, confidence and model version.
3. Lifecycle instrumentation for AI Coach: started, completed, interrupted, failed; exercise, source, duration, reps, good/bad window counts, inference time aggregate, model-load/feature/inference/camera/pose error categories. No frame data.
4. A reproducible offline evaluation harness (`scripts/evaluate-models.py`) that runs the **shipped** form ONNX models against the stored participant-independent test split, re-runs the recommendation ONNX on its held-out split, and writes a machine-readable report consumed by the admin UI.
5. Admin Model Monitoring rebuilt around real monitoring aggregates, offline evaluation metrics, model/deployment state and activity charts — with date filters, explicit sample size and capped-query notices.
6. Admin AI Coach Monitoring rebuilt around session lifecycle events, classification outcomes, failures and model version, with date/exercise/status filters and paginated session history.
7. An AI Error Log admin page fed by the same events (error category, frequency, recent occurrences), plus permission-gated navigation.
8. Firestore rules that validate every monitoring event, forbid client updates/deletes, restrict reads to the owner or `manage_ai` admins, and keep official evaluation/registry data out of client-writable storage; composite indexes for the bounded queries.
9. Emulator rules tests (unauthenticated, owner, other member, AI admin, non-AI admin, forged fields) and asset/evaluation regression checks, followed by type-check, build, tests and a real-account browser smoke test.
10. Eight Phase 4 documents, including a completion report with explicit COMPLETED / PARTIALLY COMPLETED / NOT IMPLEMENTED / BLOCKED labels.

---

## 9. Baseline limitations carried into Phase 4

| Limitation | Consequence |
| --- | --- |
| Raw videos / `ml/dataset` missing | Form evaluation can only use the stored 444-clip feature extract; no new video-level or window-level evaluation is possible offline. |
| No historical model versions | Version history in admin can only show the currently deployed `1.0.0` artifacts; it cannot invent prior versions. |
| Client-reported telemetry | Counts describe what clients reported; a tampered client can inflate its own events. Rules prevent writing as another user and prevent official evaluation writes. |
| Synthetic recommendation dataset | The 1.0000 stored score does not measure real-athlete generalisation. It will be labelled as synthetic. |
| Firebase free tier | Monitoring uses bounded date ranges (default 30 days, cap 500–1,000 events per query) and no Cloud Functions. |
| `ml/reports/summary.json` says 25–26 participants, 444 videos | Evaluation report must show the actual test n (24 per exercise) rather than implying the full dataset was re-scored. |

---

## 10. Audit conclusion

The AI product surface is functional and privacy-preserving, and the evaluation evidence is present but not operationalised. The monitoring layer required by Phase 4 does not exist: admin pages are a read-only projection of saved AI sessions, inference latency and failures are explicitly unavailable, and there is no executable evaluation or error surface. The work in Phase 4 is therefore additive: instrument without changing model behavior, keep monitoring off the critical path, evaluate the shipped artifacts on the recorded held-out split, and replace snapshot-based admin reads with bounded, filtered, real-data queries.

No code, model, rule or dataset was modified during Stage One.