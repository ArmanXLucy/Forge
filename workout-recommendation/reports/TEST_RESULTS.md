# Test results — AI workout recommendation

Date: 2026-11-22. Every result below was actually executed in this workspace.

## Summary

| Area | Result |
|---|---|
| TypeScript typecheck | PASS |
| Unit tests (Vitest) | PASS — 55/55 |
| Production build | PASS |
| ONNX Python validation | PASS |
| Browser end-to-end (Chrome, local dev) | PASS |
| Locked / first-day state | PASS |
| Mission answer persistence | PASS |
| Outdated plan detection | PASS |
| Responsive desktop / tablet / mobile | PASS (visual + DOM checks) |
| Firebase/Firestore end-to-end | NOT EXECUTED |
| Firestore rules emulator tests | NOT EXECUTED |
| Multi-user security tests | NOT EXECUTED |
| Google Colab execution | NOT EXECUTED |
| Full legacy regression suite | NOT EXECUTED |

## 1. ML and ONNX

Commands:

```bash
workout-recommendation/.venv/Scripts/python.exe workout-recommendation/scripts/train_model.py
workout-recommendation/.venv/Scripts/python.exe workout-recommendation/scripts/validate_onnx.py
```

| Check | Result |
|---|---|
| Dataset loads (10,000 × 9) | PASS |
| Missing values handled (`Injury` 3,585, `Experience` 20) | PASS |
| 491 duplicates removed before split | PASS |
| No ambiguous input groups | PASS |
| Stratified split 6,656 / 1,426 / 1,427 | PASS |
| Random Forest and Gradient Boosting trained | PASS |
| Validation selection by macro-F1 | PASS |
| Final test evaluation (1,427 held-out) | PASS |
| Accuracy / macro-F1 | 1.0000 / 1.0000 |
| ONNX export opset 17 and runtime load | PASS |
| Input order matches schema | PASS |
| ONNX vs held-out labels | 100% agreement |
| ONNX vs original pipeline (400 samples) | 100% labels, max probability delta 1.7e-7 |
| All 24 classes predicted | PASS |
| Deterministic repeated inference | PASS |
| Batch-1 CPU latency | 0.144 ms |
| Browser WASM latency | 14.7–17 ms |
| Unknown / empty category behaviour recorded | PASS |
| `Gender = Unspecified` recorded | PASS |
| Integer-for-string rejected by ONNX Runtime | PASS |

Perfect scores are a property of the synthetic, deterministic dataset; they are not real-world evidence.

## 2. Domain tests (Vitest)

`npx vitest run` → **2 files, 55 tests passed**.

`modelInput.test.ts` (11): zero/partial/complete missions, completed-without-answers, invalid weight, badge-only unlock attempt, all mission→model mappings, injury free-text never sent to model, all 24 classes covered.

`generator.test.ts` (44): every one of the 24 categories produces a valid 7-day plan; unique weekdays; ≥1 rest day; weekly-time and experience caps; preferred days respected; knee/shoulder exclusions; equipment constraints; pending-clearance removes high impact; yoga-mat-only plan; version increment; outdated detection; authoritative snapshot.

## 3. Typecheck and build

- `npx tsc --noEmit` → PASS.
- `npm run build` → PASS (Vite 6.4.6, 29.08 s).
- `dist/models/workout_recommendation.onnx` (1,617,299 bytes) and `feature_schema.json` present.
- Existing form-classifier ONNX files present and unchanged.
- New AI page is a lazy 23.15 kB chunk; ONNX Runtime loads only when needed.

## 4. Browser end-to-end (real ONNX)

Chrome 157 headless via CDP, demo workspace, real exported artifact.

### Unlocked flow

- 7/7 missions seeded → page unlocked → generate → real inference.
- Category: `Push-Pull-Legs Split (Hypertrophy)`, 14.7–17 ms.
- 7 days rendered: 3 training, 4 rest; sets/reps/rest/instructions displayed.
- Model metadata, confidence, version, latency and top classes displayed.
- Plan persisted locally; regeneration incremented version.
- No console exceptions.

### Locked / first-day flow

- 3/7 missions seeded → locked panel visible, “3 of 7”, remaining missions listed, CTA works.
- No fake prediction and no generated plan while locked.

### Mission answer persistence

- Completed Body Metrics opened → Review → saved weight 78 prefilled → edited to 81.5 → submitted → localStorage updated to 81.5.

### Outdated flow

- Weight changed after generation → reload → “Profile changed” banner + regenerate action; previous plan preserved.

### Dashboard / My Workout Plans

- Overview spotlight shows the AI plan.
- Workouts page shows the full AI schedule with expandable exercise details.
- Navigation works; no console errors.

### Responsive

1440 px, 768 px and 390 px all render correctly. Mobile bottom nav now includes “AI Plan”.

Screenshots (git-ignored QA artifacts):
`.qa/workout-rec-locked-desktop.png`, `.qa/workout-rec-locked-mobile.png`, `.qa/workout-rec-ready.png`, `.qa/workout-rec-plan-desktop.png`, `.qa/workout-rec-plan-mobile.png`, `.qa/workout-rec-tablet.png`, `.qa/workout-rec-outdated.png`, `.qa/workout-rec-overview.png`, `.qa/workout-rec-workouts.png`.

## 5. Firestore / security

Not executed. No test account credentials were available; installing `firebase-tools` for the emulator was avoided. Browser tests ran in demo/local mode.

Statically verified: owner-only rules added for `mission_answers` and `workout_recommendations`; admin collection-group reads added; no privileged credentials in client code; no second Firebase project.

Remaining to verify before launch: emulator rule tests, owner A/B isolation, cloud read/write of generated plans, cloud failure behaviour.

## 6. Regression

Executed: full TypeScript compile, production build of all routes, existing classifier artifacts unchanged, `ml/` untouched, landing/login/missions/workouts/overview/AI Plan rendering in Chrome, no console errors.

Not executed: AI Coach camera/pose flow, Supabase upload, authenticated Firebase login/sync, admin click-through, non-Chrome browsers, screen-reader audit.

## 7. Could not execute

| Test | Reason |
|---|---|
| Colab training | No access to the authorised session; notebook and identical script provided. |
| Firestore emulator rules | `firebase-tools` not installed; avoided a large test-only dependency. |
| Real authenticated Firestore flow | No test credentials; creating one would write to production. |
| Multi-user ownership | Depends on emulator/real accounts. |
| Production deployment smoke test | Not deployed here. |

## 8. Reproduce

```bash
npm install
npx tsc --noEmit
npx vitest run
npm run build
workout-recommendation/.venv/Scripts/python.exe workout-recommendation/scripts/validate_onnx.py
```
