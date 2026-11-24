# Phase 4 — AI Monitoring

**Project:** Forge Athletic  
**Features monitored:** workout recommendation, AI Coach  
**Status:** Implemented; production data collection is pending Firestore rules/index deployment  
**Date:** 25 November 2026

---

## 1. What is monitored

Phase 4 monitors operational behaviour, not member content. It answers four questions:

1. Are members able to generate workout plans, and how often does generation fail?
2. Are AI Coach sessions starting, finishing, being abandoned, and saving?
3. How long do local inferences take, and where do failures occur?
4. How good is the deployed model on held-out data?

It does **not** answer questions about which exercises a member should do, what they said in onboarding, or what their camera saw.

---

## 2. Monitoring principles

| Principle | Implementation |
| --- | --- |
| Monitoring must never break AI | Fire-and-forget queue; no await; all failures swallowed |
| Real data only | Pages aggregate stored events and saved sessions; no mock metrics |
| Absence is not zero | `null` ratios render as `—`; days without events are gaps |
| Privacy by minimisation | No frames, landmarks, answers, email, or free text |
| Bounded cost | 7/30/90-day windows and hard document caps |
| Honest provenance | Live telemetry and offline evaluation are labelled separately |

---

## 3. Event catalogue and emission points

### 3.1 Workout recommendation

| Event | Emitted from | When | Useful fields |
| --- | --- | --- | --- |
| `recommendation.requested` | `recommendationService.ts` | Member starts generation | `sessionRef` |
| `validation.passed` | `recommendationService.ts` | Input contract accepted | `sessionRef` |
| `validation.failed` | `recommendationService.ts` | Input contract rejected | `errorCategory`, `errorCode` |
| `model.load_started` | `inference.ts` | Model or schema load begins | `modelId` |
| `model.load_succeeded` | `inference.ts` | Model and schema ready | `modelId`, `modelVersion` |
| `model.load_failed` | `inference.ts` | Asset fetch/parse or session creation failed | `errorCategory`, `errorCode` |
| `inference.started` | `inference.ts` | Prediction call begins | `sessionRef` |
| `inference.succeeded` | `inference.ts` | Prediction returned | `durationMs`, `confidence`, `category` |
| `inference.failed` | `inference.ts` | Prediction threw | `errorCategory`, `errorCode` |
| `recommendation.generated` | `recommendationService.ts` | A plan was produced | `category`, `confidence`, `durationMs` |
| `recommendation.failed` | `recommendationService.ts` | Generation did not produce a plan | `errorCategory`, `errorCode` |
| `recommendation.saved` | `useRecommendationStore.ts` | Plan persisted | `sessionRef` |
| `recommendation.save_failed` | `useRecommendationStore.ts` | Persistence failed | `errorCategory`, `errorCode` |

A single successful generation normally produces a requested, validation, model load, inference, generated and saved sequence. Failures stop at the stage that failed.

### 3.2 AI Coach

| Event | Emitted from | When | Useful fields |
| --- | --- | --- | --- |
| `coach.session.started` | `AICoachPage.tsx` | Camera or video attempt begins | `sessionRef`, `exercise`, `source` |
| `model.load_started` | `AICoachPage.tsx` | Pose landmarker or form classifier load begins | `modelId` |
| `model.load_succeeded` | `AICoachPage.tsx` | Load completed | `modelId`, `modelVersion` |
| `model.load_failed` | `AICoachPage.tsx` | Load failed | `errorCategory`, `errorCode` |
| `coach.session.completed` | `AICoachPage.tsx` | Member finished the attempt | duration, inference sum/count, reps |
| `coach.session.interrupted` | `AICoachPage.tsx` | Reset, navigation, or unmount | duration, inference sum/count, reps |
| `coach.session.failed` | `AICoachPage.tsx` | Camera/video failure | `errorCategory`, `errorCode` |
| `inference.failed` | `AICoachPage.tsx` | A scoreable window throws | `errorCategory`, `errorCode` |
| `coach.session.saved` | `AICoachPage.tsx` | Saved session record created | duration, inference sum/count, reps |

AI Coach does not emit one event per frame, per rep, or per successful score. Per-window successes are aggregated into `inferenceMsSum` and `inferenceCount`, which keeps volume bounded and avoids a de facto movement trace.

---

## 4. Write-path behaviour

`src/services/monitoring/aiMonitoring.ts` is the only writer.

```text
trackAIEvent(input)
  -> disabled? drop
  -> offline? drop
  -> anonymous / signed out? drop
  -> rate limited? drop
  -> duplicate error within 60s? drop
  -> sanitise message
  -> enqueue (max 25)
  -> flush after 1.2s or when full
  -> setDoc per event with serverTimestamp
  -> Promise.allSettled; failures ignored
```

### 4.1 Message sanitisation

| Input pattern | Replacement |
| --- | --- |
| `http://` or `https://` URL | `[url]` |
| Email address | `[email]` |
| 32+ characters of token-like `[A-Za-z0-9_-]` | `[redacted]` |
| Repeated whitespace | single space |
| More than 240 characters | truncated to 240 |

The sanitised message is intended for administrators, not members. It is still treated as untrusted text in the UI.

### 4.2 What is deliberately not implemented

- No retry or offline queue: stale telemetry is less useful than live telemetry, and local persistence would create a new privacy surface.
- No per-user server-side rate limit beyond rules and the client cap.
- No automatic alerting or paging.
- No stack traces.

---

## 5. Admin metric definitions

All live metrics use events inside the selected window. `now` is the page load time; windows are 7, 30 or 90 days.

### 5.1 Model Monitoring (`/admin/ai-monitoring`)

| Metric | Numerator | Denominator | Empty state |
| --- | --- | --- | --- |
| Plans generated | `recommendation.generated` count | none | `0` with no requests note |
| Generation success | `recommendation.generated` | `recommendation.requested` | `—` |
| Members using AI | Distinct `userId` in recommendation events | none | `0` |
| Inference latency | Mean `durationMs` on `inference.succeeded` | measured runs | `—` |
| p95 latency | Nearest-rank p95 of `inference.succeeded.durationMs` | measured runs | `—` |
| Error events | Events with `status = error` | none | `0` |
| Failure categories | Count by `errorCategory` on error events | none | `no errors` |
| Plan-category mix | Count by `category` on `recommendation.generated` | none | `no generated plans` |

Generation success is computed against **requests**, not against generated plans. A request that never emits a generated event counts against the rate. This is intentional but lossy if the request event itself is dropped.

### 5.2 AI Coach Monitoring (`/admin/ai-coach-monitoring`)

| Metric | Numerator | Denominator | Empty state |
| --- | --- | --- | --- |
| Saved sessions | Distinct saved `ai_sessions` documents | none | `0` |
| Members | Distinct parent UIDs in saved sessions | none | `0` |
| Total reps | Sum of `reps` in saved sessions | none | `0` |
| Average form | Mean `averageFormScore` on judged saved sessions | judged sessions | `—` |
| Completion rate | `coach.session.completed` | completed + interrupted + failed | `—` |
| Failure rate | `coach.session.failed` | completed + interrupted + failed | `—` |
| Session starts by exercise | `coach.session.started` grouped by exercise | none | `no starts` |
| Mean inference latency | Sum of saved `inferenceMsSum` / sum of saved `inferenceCount` | scored windows | `—` |
| p95 latency | Nearest-rank p95 of per-session average latency | saved sessions | `—` |

Saved-session metrics come from `users/{uid}/ai_sessions`, not from event counts. They remain available even if the `coach.session.saved` event is lost. They are still limited to the newest 500 session documents.

### 5.3 AI Error Log (`/admin/ai-errors`)

| Metric | Definition |
| --- | --- |
| Error events | `status = error` inside the window, optional feature filter |
| Affected members | Distinct `userId` across those errors |
| Failure categories | Distinct `errorCategory` values |
| Latest error | Newest error event |
| Feature split | Recommendation vs AI Coach counts |
| Category breakdown | Count by `errorCategory` |
| Daily volume | Error count per UTC day; no-error days are omitted |

The error log is an operational view, not a complete incident history. Client-reported failures can be missing when the browser is offline or the write is rejected.

---

## 6. Reading the dashboards honestly

### Lower-bound counts

A monitoring write is not part of the AI transaction. If it fails, the member still gets their plan or workout. Therefore every event count is a lower bound. The AI Coach page states:

> Failures are client-reported; a lost event reduces counts but never blocks a workout.

### Absence vs zero

| Situation | Display |
| --- | --- |
| No saved sessions | `0` and `No saved sessions in window` |
| Saved sessions but none scored | `—` and `Saved sessions had no scoreable windows` |
| Day with events but no errors | errors `0` |
| Day with no events | not plotted; null gap |
| No latency measurements | `—` and `No successful inference timed yet` |

### Capped windows

The scope notice states the exact count, start time, cap, and whether the cap was reached. A cap notice is not an error; it means `latest N` rather than `all`.

### Client clock and UTC

Event timestamps are server timestamps. Daily charts bucket by UTC date (`iso.slice(0, 10)`), so an admin in a local timezone may see a day boundary differ from their wall clock.

### Recommendation latency

Latency is measured on the member device around the ONNX call, not server round-trip time. It includes browser and WASM scheduling variance and is not comparable across devices.

### AI Coach latency

The mean is a weighted mean of saved-session per-inference averages: total inference milliseconds divided by total scored windows. The p95 is computed over per-session averages, not individual windows, because individual windows are not stored.

---

## 7. Privacy guarantees

Stored event content is limited to the allowlist in [Database Schema](./PHASE_4_DATABASE_SCHEMA.md). In particular:

- No camera frames or video are uploaded for monitoring.
- No pose landmarks are uploaded.
- No per-frame or per-rep trace is stored.
- No onboarding answers, goals, injuries, or free text are stored.
- Error messages are sanitised before the queue.
- The member UID is stored for ownership and affected-member counts; it is not displayed as a name.

The admin table shows the raw UID because Phase 4 does not join member profiles. This is an operational identifier, not a name or email.

---

## 8. Operating the monitoring pages

### Access

Sign in through `/admin/login` with an account that has an active `adminUsers/{uid}` record and the `manage_ai` permission. Member accounts are rejected.

### Refresh

Each page loads once and offers a `Refresh` button. There is no realtime listener and no polling loop. A page refresh is a fresh bounded query.

### If the page shows a permission error

The likely cause is that the new Firestore rules are not deployed. The production project currently exhibits this. See [Completion Report](./PHASE_4_COMPLETION_REPORT.md) for the exact deployment command.

### If the page shows an index-required error

Deploy `firestore.indexes.json`. The UI surfaces the Firestore message and keeps the page mounted.

### If the page is empty

Check, in order:

1. Is the signed-in account an active AI admin?
2. Has a signed-in, non-anonymous member generated a plan or completed an AI Coach session since the selected window?
3. Is the browser online and Firestore configured?
4. Are the rules and indexes deployed?

---

## 9. Verification performed

| Check | Result |
| --- | --- |
| Aggregation unit tests | 7/7 passed |
| Static report integrity tests | 7/7 passed |
| Rules security tests | 58/58 passed, including 11 AI monitoring tests |
| Typecheck | Passed |
| Production build | Passed; all model assets verified |
| Recommendation generation in a real signed-in production session | v7 generated, no product regression |
| Admin pages against local emulator with seeded test records | All three pages rendered real aggregates, filters, caps and empty-state logic |
| Production admin page read | `permission-denied` because new rules are not deployed |

The emulator data was test-only, inserted outside the repository, and removed after verification. It is not presented as production analytics.

---

## 10. Known limitations

1. **Rules/indexes not deployed.** Production telemetry writes and admin reads are currently denied. This is the primary blocker.
2. **Lossy telemetry.** No retry, no backfill, no server-side receipt guarantee.
3. **No automated alerting.** The error log requires an admin to open it.
4. **No server-side rate limit.** The 100/minute cap is client-side; rules validate schema but cannot throttle.
5. **Client-reported events.** A malicious signed-in client could forge plausible events for its own UID. Rules constrain shape and ownership, not truth.
6. **Retention not automated.** No TTL or scheduled cleanup exists yet.
7. **No profile join.** Admin tables show UIDs, not member names.
8. **No per-event sampling metadata.** The UI states counts are lower bounds but cannot quantify drop rate.

These limitations are acceptable for Phase 4 because monitoring is additive and non-blocking; they must be addressed before treating the dashboards as an audit system.

---

## 11. Related documents

- [Architecture](./PHASE_4_ARCHITECTURE.md)
- [Database Schema](./PHASE_4_DATABASE_SCHEMA.md)
- [Model Evaluation](./PHASE_4_MODEL_EVALUATION.md)
- [Security Report](./PHASE_4_SECURITY_REPORT.md)
- [Test Report](./PHASE_4_TEST_REPORT.md)