# Implementation report — AI-powered personalised workout recommendation

Date: 2026-11-22
Scope: `F:\Fitness Coach`
Decision taken with the project owner: **local/browser inference first**, backend enforcement later.

## 1. Existing architecture inspected

| Area | Finding |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript SPA, React Router, Tailwind, Zustand, TanStack Query available |
| Backend | **None in this repository.** No Express/Node/Python API server, no Vercel functions. `vercel.json` only rewrites SPA routes. |
| Authentication | Firebase Auth via `src/features/auth/AuthContext.tsx`, with a clearly labelled demo workspace |
| Firestore | Client SDK only (`src/lib/firebase.ts`), per-user documents under `users/{uid}` and subcollections |
| Supabase | Storage only for profile photos (`supabase/functions/profile-image`) |
| Missions | 7 definitions in `src/data/missions.ts`; completion status persisted, **answers intentionally discarded** before this change |
| Workout plans | `src/pages/Dashboard/WorkoutsPage.tsx` with sample templates and a workout player; no AI plan persistence |
| Exercise form classifier | `src/features/ai-coach/*` + `public/models/form_classifier_*.onnx`; **untouched** |
| `F:\Fitness Coach\ml` | Existing model training code/artifacts; **read-only, untouched** |
| Design system | Orange `#F97316`, charcoal `#171717`, ivory `#F7F5F0`, Anton display type, shared `Button`, `Badge`, `SectionCard`, `ProgressRing` |

Because there is no server, the prompt's "existing backend must verify missions" requirement cannot be satisfied without introducing new infrastructure. Per the owner's direction, this implementation runs inference in the browser and keeps the data model ready for a server-side promotion.

## 2. Dataset used and verified schema

- Dataset: `Tomertg/SmartFit_Dataset`, parquet, MIT per dataset card.
- 10,000 rows, 9 columns, 24 plan classes.
- Missing `Injury` (3,585) and `Experience` (20) values were normalised.
- 491 exact duplicates removed before splitting (10,000 → 9,509).
- No ambiguous input groups.
- Full inspection is in `reports/TRAINING_REPORT.md`.

## 3. Dataset preprocessing

- Missing categorical values → `Unknown`.
- Duplicate removal before splitting.
- `BMI` derived deterministically.
- Stratified 70/15/15 split (6,656 / 1,426 / 1,427).
- Full pipeline fitted inside `ColumnTransformer` + classifier, so no leakage.
- Target label mapping saved in `artifacts/feature_schema.json` and `artifacts/model_classes.json`.

## 4. Model algorithms compared

| Model | Validation macro-F1 | ONNX size |
|---|---|---|
| Random Forest (150 trees, depth 16) | 1.0000 | 25.7 MB |
| Gradient Boosting (120 estimators, depth 4) | 1.0000 | 1.6 MB |

XGBoost was considered but not exported because `skl2onnx` lacks a converter for it without another dependency.

## 5. Actual evaluation metrics

- Test accuracy: **1.0000**
- Macro precision / recall / F1: **1.0000 / 1.0000 / 1.0000**
- Weighted F1: **1.0000**
- Confusion matrix: 1,427 correct, 0 off-diagonal
- This is a property of the synthetic, deterministic dataset, not evidence of real-world effectiveness.

Full tables: `reports/EVALUATION_REPORT.md`.

## 6. Selected model and reason

**Gradient Boosting.** Both candidates scored identically on validation macro-F1. The tie-break was deployment footprint and export compatibility: 1.6 MB vs 25.7 MB, ONNX runtime deterministic, maximum probability delta 1.75 × 10⁻⁷ versus the sklearn pipeline.

## 7. ONNX export details

| Item | Value |
|---|---|
| Artifact | `workout-recommendation/artifacts/workout_recommendation.onnx` |
| Size | 1,579,399 bytes |
| Opset | 17 |
| Input | 9 tensors: `Age`, `Weight_kg`, `Height_cm`, `BMI` (float32 `[N,1]`), `Gender`, `Goal`, `Equipment`, `Experience`, `Injury` (string `[N,1]`) |
| Outputs | `label` (int64), `probabilities` (float32 `[N,24]`) |
| Preprocessing | **Inside the ONNX graph** — scaling and one-hot encoding are part of the exported pipeline |
| Production dependency | ONNX Runtime Web in the browser; no pickle/joblib |

Supporting artifacts:

- `artifacts/feature_schema.json` — feature order, vocabularies, ONNX input/output metadata, class labels.
- `artifacts/model_metadata.json` — versions, dataset split, selection scores, test metrics.
- `artifacts/training_results.json` — full comparison, per-class metrics, confusion matrix.
- `artifacts/onnx_validation.json` — independent runtime validation.

## 8. ONNX validation results

- 1,426 held-out samples: **100% label agreement**.
- All 24 classes predicted.
- Deterministic across repeated runs.
- CPU batch-1 latency: **0.144 ms/sample**; browser WASM: **~15–17 ms** after initialisation.
- Unknown/empty categories are accepted as all-zero one-hots; the app validates values before inference.
- Integer values for string inputs are rejected by ONNX Runtime; the service always builds string tensors.
- See `reports/EVALUATION_REPORT.md` and `artifacts/onnx_validation.json`.

## 9. Inference integration architecture

```
Mission forms
   ↓ (validated answers)
Local profile store + Firestore `users/{uid}/mission_answers/{missionId}`
   ↓
evaluateReadiness()  ← checks completion + required fields + ranges
   ↓
buildModelInput()    ← maps mission vocabulary to the model contract
   ↓
predictPlanCategory() ← ONNX Runtime Web, lazy-loaded session, model fetched once
   ↓
generateWorkoutPlan() ← rule-based 7-day engine + safety filters
   ↓
validatePlan()        ← structural + safety validation before persistence
   ↓
Firestore `users/{uid}/workout_recommendations/{id}` + local cache
```

Key modules:

| Module | Responsibility |
|---|---|
| `lib/modelInput.ts` | Readiness validation, mission → model mapping, injury keyword derivation, input clamping |
| `lib/inference.ts` | ONNX Runtime Web session, schema validation, typed errors, preload, latency |
| `lib/planValidator.ts` | Seven-day structure, rest day, sets, equipment, injury conflicts |
| `lib/generator.ts` | Session templates, equipment/injury filtering, dose prescription, duration, safety summary |
| `lib/recommendationService.ts` | Readiness gate, inference call, plan creation, authoritative snapshot, staleness |
| `store/useRecommendationStore.ts` | Plan state, generation guard, history, outdated sync |
| `data/recommendationRepository.ts` | LocalStorage + Firestore persistence |
| `data/exerciseLibrary.ts` | 80+ curated exercises with equipment, difficulty, instructions and contraindications |
| `data/planCatalog.ts` | All 24 model classes mapped to session templates |

**No HTTP API was created.** The suggested endpoints (`/status`, `/generate`, `/active`, `/regenerate`, `/history`) remain the backend-phase plan. The current functions are structured so they can be moved behind an API without changing the UI contract.

## 10. Workout-generation architecture

1. The classifier predicts one of 24 plan categories.
2. `planCatalog` maps the category to a session template (full-body strength, upper/lower, push-pull-legs, bodyweight circuit, HIIT, mobility, endurance, sculpting, power).
3. Session count is derived from:
   - preferred workout days from Quick Start,
   - weekly protected time from Mindset Mission,
   - experience level,
   - template limits.
4. Weekdays use the user's preferred days; otherwise defaults. At least one rest day is enforced.
5. Exercises are selected from the curated library by:
   - movement pattern required by the session,
   - available equipment (derived from the Training History mission),
   - experience-appropriate difficulty,
   - injury contraindications,
   - deterministic variety scoring.
6. Dose (sets, reps/duration, rest) is set by template intensity, experience and session type.
7. Duration is estimated from work + rest + warm-up.
8. Safety is applied before persistence; the plan is rejected if validation fails.
9. The schedule is saved with a mission snapshot, model version, confidence, top probabilities, inference time and plan version.

## 11. My Missions integration

- All seven missions and their actual field IDs are used. No fields were invented.
- A `gender` select was added to Body Metrics because the model contract requires it and the app did not previously collect it. It is optional and defaults to `Unspecified`.
- Answer persistence is new: `MissionDetailPage` now saves answers on submit/save-for-later, and the profile store exposes them.
- Required model fields:
  - Body Metrics: `weight`, optional `gender`
  - Health Profile: `conditions`, `clearance`, `injuries`, `restrictions`
  - Training History: `experience`, `equipment`
  - Goal Deep Dive: `primaryGoal`
  - Mindset: `weeklyTime`
  - Lifestyle: `stress`, `sleepHours` (used for recovery/volume)
- Completion alone does not unlock: `evaluateReadiness` checks persisted answers, required fields, ranges and profile values.
- Users with legacy completed missions but no saved answers see an explicit "answers needed / re-open mission" state.

**Privacy change:** the mission forms previously discarded answers. They now persist them to the user's account because a personalised plan requires real data. The UI copy was updated to say this, to warn against entering medical documents, and to point to Settings for data clearing. This is a product/privacy decision that must be reflected in the privacy policy before launch.

## 12. Firestore integration

Existing database and connection reused. No second Firebase project, no second SDK instance.

New per-user subcollections:

```
users/{uid}/mission_answers/{missionId}
  missionId, userId, values, updatedAt, schemaVersion

users/{uid}/workout_recommendations/{recommendationId}
  recommendationId, userId, modelVersion, modelSource,
  predictedPlanCategory, planTemplateId, planTitle,
  fitnessGoal, datasetGoal, missionSnapshot,
  schedule[7], safety, createdAt, updatedAt,
  isActive, isOutdated, version, generationStatus,
  inferenceMs, confidence, classProbabilities
```

`schedule` days contain `dayNumber`, `dayName`, `weekday`, `workoutTitle`, `focus`, `muscleGroups`, `estimatedDuration`, `difficulty`, `kind`, `exercises`, `recoveryNotes`.
Exercises contain `exerciseId`, `exerciseName`, `sets`, `repetitions`, `durationSeconds`, `restSeconds`, `instructions`, `equipment`, `primaryMuscle`.

Rules were extended with explicit owner-only blocks for both subcollections and admin collection-group reads. Local storage is used as an offline/demo fallback.

## 13. Frontend components/pages modified

Created:

- `src/pages/Dashboard/WorkoutRecommendationPage.tsx` — locked/unlocked states, generation, plan view, history, safety, model metadata, responsive layout.
- `src/features/workout-recommendation/components/RecommendationSpotlight.tsx` — always-visible dashboard/Workouts entry point with dynamic progress.
- `src/features/workout-recommendation/components/PlanSchedule.tsx` — expandable 7-day schedule with exercise details.
- `src/store/useRecommendationStore.ts`, hook, repository, domain modules, tests.

Modified:

- `src/App.tsx` — `/dashboard/workout-recommendation` route.
- `src/components/navigation/dashboardNav.ts` — "AI Plan" nav item.
- `src/pages/Dashboard/OverviewPage.tsx` — spotlight card visible from day one.
- `src/pages/Dashboard/WorkoutsPage.tsx` — active AI plan and full schedule inside My Workout Plans.
- `src/pages/Dashboard/MissionDetailPage.tsx` — answer persistence, prefill, privacy copy.
- `src/pages/Dashboard/MissionsPage.tsx` — unlock copy.
- `src/pages/Dashboard/SettingsPage.tsx` — clears in-memory plans on profile reset.
- `src/data/missions.ts` — optional gender field.
- `src/services/authService.ts` — dev-only demo session resumption (no production effect).
- `src/store/useProfileStore.ts` — persisted mission answers.
- `firestore.rules` — new collections.

No visual theme was introduced; the UI reuses existing cards, typography, orange accent, charcoal and ivory palette, sidebar and responsive patterns.

## 14. APIs implemented

No HTTP endpoints. The equivalent operations are implemented client-side:

| Operation | Implementation |
|---|---|
| Get status | `useWorkoutRecommendation()` → `evaluateReadiness` + active plan + outdated flag |
| Generate | `useRecommendationStore.generate()` → `createRecommendation()` |
| Get active plan | `selectActivePlan()` |
| Regenerate | Same generate path, version incremented, previous plans deactivated and preserved |
| History | `plans` ordered by `createdAt`, displayed with version selection |

## 15. Security measures

- Firestore rules restrict `mission_answers` and `workout_recommendations` to the authenticated owner; admin read via role checks; no service-role key in the frontend.
- Input vocabulary and numeric ranges validated before inference.
- Medical free text is **never** sent to the model; only a derived injury category is used.
- Safety filters exclude exercises that conflict with recorded injuries, pending restrictions or high-impact work under professional review.
- The UI never fabricates a plan or prediction; inference failures show an error and save nothing.
- Generation is guarded against duplicate concurrent requests.
- Plans store only the authoritative answer subset plus a profile snapshot.
- No new secrets or global credentials.

## 16. Files created

```
workout-recommendation/
  .gitignore
  README.md
  artifacts/workout_recommendation.onnx
  artifacts/feature_schema.json
  artifacts/model_metadata.json
  artifacts/model_classes.json
  artifacts/training_results.json
  artifacts/onnx_validation.json
  notebooks/smartfit_training.ipynb
  scripts/train_model.py
  scripts/validate_onnx.py
  reports/TRAINING_REPORT.md
  reports/EVALUATION_REPORT.md
  reports/IMPLEMENTATION_REPORT.md
  reports/TEST_RESULTS.md

scripts/copy-ort-wasm.mjs
scripts/copy-model-assets.mjs
public/models/workout_recommendation.onnx        (generated by prebuild)
public/models/feature_schema.json                (generated by prebuild)

src/features/workout-recommendation/
  types.ts
  data/planCatalog.ts
  data/exerciseLibrary.ts
  data/recommendationRepository.ts
  lib/modelInput.ts
  lib/inference.ts
  lib/generator.ts
  lib/planValidator.ts
  lib/recommendationService.ts
  hooks/useWorkoutRecommendation.ts
  components/PlanSchedule.tsx
  components/RecommendationSpotlight.tsx
  __tests__/modelInput.test.ts
  __tests__/generator.test.ts

src/pages/Dashboard/WorkoutRecommendationPage.tsx
src/store/useRecommendationStore.ts
```

## 17. Existing files modified

See section 13. `F:\Fitness Coach\ml` was not read or modified by the implementation, and the existing exercise-form classifier artifacts were not touched.

## 18. Known limitations

1. **No server-side enforcement.** Mission completion, ownership and model output are verified in client code. A determined user can write their own Firestore documents because the rules permit owner writes. This was accepted for the local-first phase; production should move generation to a trusted API and make recommendation writes server-only.
2. **Firestore path not exercised end to end** in this environment because no test account credentials were available; browser tests ran in the demo workspace, which uses localStorage. Rules compile but were not tested with the emulator.
3. **Colab was not executed.** The notebook is ready and uses the same script.
4. **Synthetic dataset.** Perfect metrics are not real-world validity.
5. **Model scope.** The model predicts a broad category; the seven-day schedule is rule-based, not learned exercise-by-exercise.
6. **Exercise library.** Instructions are conservative but curated, not clinically certified.
7. **Gender.** `Unspecified` is not a trained category; it encodes to all-zero one-hot.
8. **ONNX WASM delivery.** Inference uses the version-pinned jsDelivr CDN for the ONNX Runtime WASM glue because Vite 6 cannot module-import it from `public/` in dev. The ONNX model itself is served locally. Offline generation would need a Vite-compatible local WASM setup.
9. **History pagination.** All plans for the user are loaded; fine for normal use, but pagination should be added for very long histories.
10. **AI plan workout completion.** The existing workout player is not wired to AI schedule days; "start/complete workout" for generated days is not implemented.
11. **Mission answers now persisted.** Privacy copy and policy need review; sensitive medical free text should be minimised or moved behind a server-side field policy.
12. **Nutrition mission answers are stored but unused by the model.** They were kept for consistency and future use.

## 19. Deployment requirements

1. `npm install` (adds `onnxruntime-web`; `vitest` is dev-only).
2. `npm run model:assets` runs automatically before `dev`/`build` and copies the ONNX artifact + schema to `public/models`. The committed artifact is in `workout-recommendation/artifacts/`.
3. Deploy `firestore.rules` with `firebase deploy --only firestore:rules`.
4. No new environment variables. Existing Firebase and Supabase configuration is reused.
5. Browser must be able to load the ONNX Runtime WASM glue from `cdn.jsdelivr.net` (or change `ORT_VERSION`/`wasmPaths` in `src/features/workout-recommendation/lib/inference.ts` to a self-hosted, Vite-compatible path).
6. `npm run build` produces the SPA; `vercel.json` already rewrites routes to `index.html`.
7. For the backend phase, promote `evaluateReadiness`, `buildModelInput`, inference and generation to a trusted server (Firebase Admin or Vercel function), then set `workout_recommendations` writes to `if false`.
