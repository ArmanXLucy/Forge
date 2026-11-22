# Phase 1 — Recommendation Security Plan

**Status:** planning only. No recommendation generation, schema, validation, or write behavior was changed in Phase 1.

---

## 1. Current architecture

```text
7 completed missions + persisted answers
  → evaluateReadiness()
  → buildModelInput()
  → browser ONNX inference (24 plan categories)
  → generateWorkoutPlan() + validatePlan()
  → persistRecommendation() to Firestore
  → useRecommendationStore / Workout pages read it back
```

Key files:

- `src/features/workout-recommendation/lib/recommendationService.ts`
- `src/features/workout-recommendation/lib/inference.ts`
- `src/features/workout-recommendation/lib/generator.ts`
- `src/features/workout-recommendation/lib/planValidator.ts`
- `src/features/workout-recommendation/data/recommendationRepository.ts`
- `src/store/useRecommendationStore.ts`
- `src/features/workout-recommendation/hooks/useWorkoutRecommendation.ts`
- `src/pages/Dashboard/WorkoutRecommendationPage.tsx`
- `src/pages/Dashboard/WorkoutsPage.tsx`

---

## 2. Firestore document structure

Path: `users/{uid}/workout_recommendations/{recommendationId}`

Fields written by the client:

| Field | Type | Client-controlled? | Security concern |
|---|---|---|---|
| `recommendationId` | string | Yes | Can be arbitrary document ID |
| `userId` | string | Yes (must equal UID under rules) | Owner spoofing limited |
| `modelVersion` | string | Yes | Can claim any version |
| `modelSource` | `'onnx-web'` | Yes | Can be forged |
| `predictedPlanCategory` | string | Yes | Can be arbitrary |
| `planTemplateId` | string | Yes | Can reference any template |
| `planTitle` | string | Yes | Can be arbitrary |
| `fitnessGoal` / `datasetGoal` | string | Yes | Can contradict inputs |
| `missionSnapshot` | object | Yes | Can omit or alter health context |
| `missionSnapshot.answers` | object | Yes | Sensitive, can be forged/modified |
| `schedule` | array | Yes | Can contain unsafe or arbitrary exercises |
| `safety` | object | Yes | Can hide restrictions/review flag |
| `createdAt` / `updatedAt` | timestamp/string | Created client, updated server | Timestamp integrity partial |
| `isActive` | boolean | Yes | Can activate multiple plans |
| `isOutdated` | boolean | Yes | Can hide staleness |
| `version` | number | Yes | Can claim schema version |
| `generationStatus` | string | Yes | Can claim `ready` |
| `inferenceMs` | number | Yes | Can fabricate telemetry |
| `confidence` | number | Yes | Can fabricate confidence |
| `classProbabilities` | array | Yes | Can fabricate probabilities |

`persistRecommendation()` uses `setDoc(..., { merge: true })` and adds `userId` and `updatedAt`. `deactivateRecommendations()` writes `isActive: false` to other plans.

### Consequence

Frontend validation (`validatePlan()`, readiness checks) improves UX but is **not a security boundary**. A modified client can bypass it and write any schedule/safety content accepted by the rules.

---

## 3. Current read/write operations

| Operation | Function | Path | Actor |
|---|---|---|---|
| Read history | `fetchRecommendations(uid)` | collection query, `orderBy createdAt desc` | Owner / admin |
| Persist new/active | `persistRecommendation(uid, plan)` | `setDoc` merge | Owner |
| Deactivate others | `deactivateRecommendations(uid, exceptId)` | reads all, updates `isActive` | Owner |
| Mark outdated | `markRecommendationsOutdated(uid, bool)` | updates all active | Owner (unused) |
| Sync outdated | `useRecommendationStore.syncOutdated()` | active plan update | Owner |
| Delete all | `deleteAllRecommendations(uid)` | deletes all | Owner/super_admin (unused) |
| Admin read | collection-group rule only | `{path=**}/workout_recommendations` | `canManageUsers()` after Phase 1 |
| Member read | `fetchRecommendations()` | owner subcollection | Active owner |
| Local cache | localStorage | `forge:v1:recommendations:{uid}` | Browser |

### Phase 1 rule state

- Owner can read/write own plans while active.
- Suspended owner cannot read/write plans.
- `super_admin` / `admin` can read all recommendation documents.
- `fitness_manager`, `support_manager`, `analyst` cannot read them.
- Catch-all deny remains.
- **Client writes are intentionally still allowed** because no trusted replacement exists.

---

## 4. Why not deny client writes now

Denying client writes would immediately break:

1. `useRecommendationStore.generate()` → `persistRecommendation()`
2. Plan history hydration
3. `deactivateRecommendations()`
4. `syncOutdated()`
5. The AI Plan page and AI Workouts view

There is no backend function, server endpoint, or Admin SDK writer in the project. A rule-only block would produce a broken feature, not security.

---

## 5. Trusted replacement design

### Recommended target

```text
Browser
  → authenticated HTTPS request (Firebase ID token)
  → trusted server endpoint
      → verify Firebase ID token
      → load authoritative profile + mission answers server-side
      → evaluate readiness server-side
      → run the same model/generator/validator (server port or hosted model)
      → write recommendation with Admin SDK
  → client reads the plan
```

### Server responsibilities

1. Verify Firebase ID token (issuer, audience, expiry, subject).
2. Reject suspended/disabled accounts.
3. Load profile and mission answers from Firestore using the Admin SDK, not from the request body.
4. Recompute readiness and model input server-side.
5. Run the same deterministic generator/validator.
6. Write server-owned fields:
   - `userId`, `recommendationId`, `createdAt`, `updatedAt`
   - `modelVersion`, `modelSource`
   - `missionSnapshot`
   - `schedule`, `safety`
   - `confidence`, `classProbabilities`, `inferenceMs`
   - `generationStatus`, `version`
7. Deactivate previous plans transactionally.
8. Return only the created plan/reference.
9. Never trust client-provided plan content.

### Migration options

| Option | Fit | Notes |
|---|---|---|
| Firebase Cloud Function (callable/HTTPS) | Good if staying Firebase-native | Admin SDK, token verification, Firestore writes |
| Vercel/Node serverless endpoint | Good if hosting stays Vercel | Needs Firebase Admin credentials; may need ONNX runtime packaging |
| Supabase Edge Function | Possible | Already used for image upload; would need Firebase Admin/auth equivalent and model runtime |
| Cloud Run container | Strong for ONNX/ML | More operations; out of Phase 1 scope |

Do not choose/implement in Phase 1. The project currently has no backend deployment pipeline for this.

---

## 6. Frontend changes required later

| Current function | Future behavior |
|---|---|
| `useRecommendationStore.generate()` | Call server endpoint instead of local `createRecommendation()` + `persistRecommendation()` |
| `createRecommendation()` | Move to shared server module or keep only as local preview |
| `persistRecommendation()` | Remove from client path; server writes |
| `deactivateRecommendations()` | Server transaction |
| `syncOutdated()` | Server recomputes or read-only flag; client must not write |
| `markRecommendationsOutdated()` | Server/admin only |
| `deleteAllRecommendations()` | Trusted deletion workflow only |
| `fetchRecommendations()` | Keep read-only |
| `useWorkoutRecommendation` | Keep same read/UI contract to avoid UI changes |

The client may keep a local preview plan for offline/demo mode, clearly marked non-authoritative. Demo mode cannot write Firestore anyway.

---

## 7. Recommended Firestore policy after migration

```text
match /users/{uid}/workout_recommendations/{recommendationId} {
  allow read: if activeOwner(uid) || canManageUsers();
  allow create, update, delete: if false; // Admin SDK bypasses rules
}
```

Collection-group admin read can remain `canManageUsers()`.

### Compatibility period

1. Deploy backend endpoint and verify it writes identical documents.
2. Switch client generation to endpoint behind a feature flag.
3. Run parallel tests comparing server and local output.
4. Set client writes to `if false`.
5. Remove fallback/local generation from the authoritative path.
6. Keep reads and UI unchanged.

Never flip the rule first.

---

## 8. Validation and testing plan

### Before migration

- Add a test proving the current owner write behavior (documented as temporary).
- Add a test proving suspended owners cannot write.
- Add a test proving other users cannot write.
- Add a test proving support/analyst cannot read recommendation snapshots.
- Add a test proving `canManageUsers()` roles can read.

### After migration

- Server rejects unauthenticated, suspended, and incomplete users.
- Server ignores client-supplied plan/safety/confidence fields.
- Server-generated document passes `validatePlan()`.
- Client cannot create/update even with a valid token.
- Owner can still read history.
- Previous plans are deactivated exactly once.
- `isOutdated` is recomputed from current answers.

---

## 9. Residual risk until migration

- A malicious member can alter their own plan, safety notes, or confidence.
- Plan data is not evidence of model output.
- Admins can read client-written recommendations after the Phase 1 role restriction.
- The plan generator may be fed forged answers if the member writes mission answers directly (owner writes are allowed by design).
- Server-side generation must also re-read answers; otherwise it inherits the same trust problem.

**Phase 1 conclusion:** document the risk, preserve functionality, and do not claim recommendations are secure because the frontend validates them.

<!-- phase1-recommendation-security-plan-complete -->
