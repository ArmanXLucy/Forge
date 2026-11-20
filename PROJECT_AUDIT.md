# Forge Athletic — Project Audit

**Audit date:** 2026-11-20  
**Scope:** authenticated user experience, shared UI, data layer, authentication, and existing AI integration  
**Project root:** `F:\Fitness Coach`  
**Models inspected read-only:** `F:\Fitness Coach\ml`, `F:\Fitness Coach\public\models`

---

## 1. Executive summary

Forge Athletic is a React 18 + Vite + TypeScript frontend with a complete marketing site, Firebase Authentication, onboarding, and nine authenticated routes. The visual foundation is consistent and on-brand, but the dashboard is still largely a **static sample-data dashboard** rather than a responsive fitness companion.

The most important finding is that **the AI is not missing — it is disconnected**:

- Three trained ONNX Random Forest form classifiers exist for squat, bicep curl and push-up.
- A browser-side MediaPipe + ONNX pipeline exists in `public/model-check.html`.
- Its feature extraction reproduces the Python training pipeline exactly.
- A parity self-test in the standalone checker passed for all three exercises.
- The React `AICoachPage` does not use any of this. It currently says “Coming in Stage 3” and “Locked”.

There is **no application backend/database layer** beyond Firebase Authentication. Mission status and Quick Start basics are stored in `localStorage`; all workouts, nutrition, progress, lifestyle, notifications and recommendation data are sample content. No user-specific training history is persisted except mission status.

**Recommended approach:** preserve the architecture and brand, build a proper shared dashboard foundation, replace sample-driven pages with empty/real local data states and logging flows, then port the proven standalone AI pipeline into a premium React AI Coach experience. Do not retrain or modify any model artifact.

---

## 2. Existing architecture

### Stack

| Area | Implementation |
|---|---|
| Framework | React 18.3 |
| Build | Vite 6 |
| Language | TypeScript 5.6 |
| Styling | Tailwind CSS 3.4 with custom Forge tokens |
| Routing | React Router 6 |
| Auth | Firebase modular SDK 11 |
| Server state | TanStack React Query 5 installed, but not used for dashboard data |
| Client state | Zustand 5 for Quick Start + mission progress |
| Forms | React Hook Form 7 + Zod |
| Charts | Recharts 2 |
| Motion | Framer Motion 11 |
| Notifications | Sonner |
| Icons | Lucide React |
| Fonts | Anton display / DM Sans Variable body |

### Route map

| Route | Page | Guard |
|---|---|---|
| `/` | Marketing landing page | Public |
| `/login` | Login | Public-only |
| `/signup` | Signup | Public-only |
| `/forgot-password` | Password reset | Public-only |
| `/onboarding` | Quick Start | Auth required |
| `/dashboard` | Overview | Auth + profile |
| `/dashboard/missions` | Mission path | Auth + profile |
| `/dashboard/missions/:missionId` | Mission form | Auth + profile |
| `/dashboard/workouts` | Workout plans | Auth + profile |
| `/dashboard/nutrition` | Nutrition | Auth + profile |
| `/dashboard/progress` | Progress | Auth + profile |
| `/dashboard/lifestyle` | Lifestyle | Auth + profile |
| `/dashboard/ai-coach` | AI Coach placeholder | Auth + profile |
| `/dashboard/settings` | Settings | Auth + profile |
| `/privacy`, `/terms` | Legal | Public |
| `*` | 404 | Public |

### Layout and navigation

- Fixed charcoal sidebar at `lg` and above (`264px`).
- Animated mobile drawer using Framer Motion.
- Sticky dashboard topbar with greeting, notifications and profile menu.
- Five-item mobile bottom navigation: Overview, Missions, Workouts, Nutrition, Progress.
- AI Coach, Lifestyle and Settings are only reachable from the drawer on mobile.
- Google/email authentication, profile completion and mission XP are surfaced in the sidebar.

### Shared components that should be preserved/extended

- `PageHeader`, `StatCard`, `DemoDataBadge`, `MissionStatusBadge`, `MissionCardMeta` in `src/components/dashboard/ui.tsx`.
- `Button`, `Badge`, `ProgressRing`, `Feedback.EmptyState`.
- `MISSION_ICONS` in `src/components/navigation/dashboardNav.ts`.
- Mission definitions and achievements in `src/data/missions.ts`.
- Brand tokens in `tailwind.config.js` and `src/index.css`.

---

## 3. Authentication and user data

### Working

- Firebase is configured through environment variables. All four required keys are present in `.env`.
- Email/password, Google popup sign-in, password reset and sign-out are implemented.
- Auth state is observed centrally; protected routes redirect to `/login`.
- Users without a Quick Start profile are redirected to `/onboarding`.
- Profile data is namespaced by Firebase UID:
  - `forge:v1:profile:<uid>`
  - `forge:v1:missions:<uid>`
- Sensitive mission answers are deliberately not persisted. Medical conditions, medication, allergies, reports and photos stay in component memory and are discarded.
- A demo-session fallback exists when Firebase variables are missing.

### Limitations

- There is **no Firestore or backend persistence** for workouts, nutrition, measurements, lifestyle or AI sessions.
- No server-side authorization exists for user records; all persisted records are browser-local.
- The app cannot claim secure cross-device health-data storage in its current state.
- `.env` currently contains configured Firebase values, so the login screen does not show the demo entry point. Demo mode is only available when Firebase variables are absent.
- Notification data is entirely sample content.

**Implication:** new features can use clearly labelled local repositories for non-sensitive demo data, but must not imply secure backend storage. Health-sensitive data must remain non-persistent unless a secure backend is added.

---

## 4. Existing dashboard pages

### 4.1 Overview

**Working**

- Personalized greeting from Quick Start/Firebase display name.
- Goal headline, profile completion ring, XP and mission count.
- Next recommended mission.
- Weekly activity chart from sample data.
- Achievements derived from real mission completion.
- Links into missions, workouts and progress.

**Problems**

- “Current weight 76.1 kg” is hardcoded and can contradict the user’s actual Quick Start weight.
- “216 minutes / 5 sessions” is sample data but visually mixed with real profile data.
- No “Today’s workout” card with a working start action.
- No streak, completed workout count, recent AI session or quick-action grid.
- Duplicate profile-completion information appears in the hero, stat cards and sidebar.
- The page is information-heavy but action-light.
- Most text is set between 8px and 11px, which is too small for a premium daily-use product.

### 4.2 My Missions

**Working**

- All seven missions are available in any order; no forced sequence.
- Completion status, XP, estimated duration and sensitive flags.
- Achievements and advanced-assessment lock state.
- Mission detail form supports validation, save-for-later status, review and reset.
- Sensitive missions use an explicit confirmation dialog and do not persist answers.
- Completion updates shared Zustand state and localStorage.

**Problems**

- In-progress mission shows a hardcoded `40%` bar rather than real form progress.
- No milestones inside each mission.
- Advanced assessments are non-interactive cards even when “unlocked”; there is no booking or start action.
- Mission cards are visually repetitive and rely on very small text.
- “Status saved locally” is correctly disclosed but could be clearer.

### 4.3 Workout Plans

**Working**

- Weekly plan overview and sample workout templates.
- Expandable session preview.
- “View session” toggles the exercise list.
- Links to the training-history mission and health profile.

**Problems**

- There is no workout player. “Start workout” does not exist.
- The primary CTA is “View session”, not an actual training action.
- Session time, working sets and volume are hardcoded.
- The weekly calendar derives sessions from sample `WORKOUTS`.
- “Today” can mismatch the real weekday because the sample `WORKOUTS[0]` is always treated as today.
- No completed workout history.
- Plan library entries are informational only.
- Attendance/adherence statistics are sample numbers presented as metrics.

### 4.4 Nutrition

**Working**

- Daily macro summary from sample meals.
- Hydration tracker is interactive but only in local component state.
- Safety notice clarifies sample meals are not a prescribed plan.
- Mission link for nutrition profile.

**Problems**

- No meal logging, editing or deletion.
- Hydration resets on refresh; no persistent daily log.
- Calorie/macro targets are sample values and are not connected to the user profile.
- No empty state; sample meals appear immediately.
- No date history.
- No actual “logged today” state.

### 4.5 Progress

**Working**

- Weekly trend chart with weight/body-fat toggle.
- Measurements, consistency chart and sample progress photos.
- Profile completion ring.

**Problems**

- Charts are entirely sample data.
- No way to log a measurement.
- No date filters, no monthly comparison and no actual workout frequency.
- Progress photos are sample images; upload is not implemented.
- “Down 2.3 kg” and “positive trend” are hardcoded conclusions.
- Empty/loading states are absent.

### 4.6 Lifestyle

**Working**

- Sleep chart, recovery habit checklist and movement/coach notes.
- Habit checklist works in local component state.
- Health language is appropriately cautious.

**Problems**

- Sleep, steps, stress and recovery score are sample data.
- Habit state resets on refresh.
- No sleep or recovery logging.
- No weekly/monthly selection.
- No link between habits and real training load.

### 4.7 Settings

**Working**

- Profile summary, mission/XP status, password reset, sign-out.
- Clear local-data versus never-stored explanation.
- Firebase configuration status.
- Local demo-data reset.

**Problems**

- No notification preferences.
- No privacy controls beyond informational panels.
- No fitness-preference editing except revisiting onboarding.
- Profile fields are read-only.
- Delete-account is a disabled label; acceptable for this stage but should remain clearly non-functional.

### 4.8 AI Coach

**Current state:** placeholder page.

**Problems**

- It explicitly tells the user AI is unavailable and disabled.
- No camera, exercise selector, pose overlay, rep count, timer, feedback or session summary.
- No use of the trained models that already exist.
- Sidebar badge says “Soon”.
- This is the largest gap between the product promise and the implemented experience.

---

## 5. AI / ML integration status

### 5.1 Trained model artifacts

Read-only artifacts:

```
public/models/
  form_classifier_bicep_curl.onnx   366 KB
  form_classifier_push_up.onnx      333 KB
  form_classifier_squat.onnx        365 KB
  model_metadata.json
```

Supporting, read-only training assets:

```
ml/
  fitness_features.py
  experiment_clip.py
  experiment_repmetry.py
  export_onnx.py
  reports/final_metrics.json
  reports/summary.json
```

No model artifacts were modified during this audit.

### 5.2 Model contract

- Input: `float32` tensor shaped `[N, 60]`.
- Feature vector: biomechanical clip/window features derived from MediaPipe Pose landmarks.
- Class order: `["BAD", "GOOD"]`.
- Compare `probabilities[1]` (GOOD) to the per-exercise threshold.
- Per-exercise thresholds:
  - squat `0.66`
  - bicep curl `0.64`
  - push-up `0.58`
- Pose input: MediaPipe Pose Landmarker Full, 33 landmarks, normalized image coordinates.
- Sampling used in training: 10 fps.
- Preprocessing and feature extraction are implemented in `ml/fitness_features.py`.
- The browser port of the feature pipeline is in `public/model-check.html`.

### 5.3 Browser prototype

`public/model-check.html` is a standalone, non-React diagnostic tool with:

- MediaPipe Pose Landmarker loading.
- Webcam and video-file input.
- 10 fps feature sampling.
- Pose skeleton overlay.
- Real ONNX inference with `onnxruntime-web`.
- Form verdict and measured feature table.
- Built-in parity self-test against `public/model-check-fixture.json`.

**Verified during this audit (headless Chrome, project-local):**

| Exercise | Max feature delta | `p(GOOD)` delta | Result |
|---|---:|---:|---|
| Squat | `5.75e-3` | `2.45e-7` | PASS |
| Bicep curl | `1.13e-2` | `3.51e-7` | PASS |
| Push-up | `2.68e-3` | `5.18e-7` | PASS |

The full checker reported **“Parity OK — the browser reproduces the training features and the model output.”**

### 5.4 Realistic model performance

The models are usable as a **secondary form signal**, not as an authoritative coach:

| Exercise | Test accuracy | Test ROC AUC | Notes |
|---|---:|---:|---|
| Squat | 0.50 | 0.653 | High false-reject rate on GOOD form |
| Bicep curl | 0.50 | 0.431 | Weak held-out separation |
| Push-up | 0.625 | 0.736 | Best held-out result |

The audit must not overstate this as “reasonably accurate” for all exercises. UI copy should say “model estimate” and avoid claiming professional form assessment.

### 5.5 Rep counting

The current model does **not** output a rep count. `model-check.html` estimates reps from `rep_rate_per_sec × duration`, which is a heuristic.

For a live product, rep counting should be implemented explicitly as a deterministic angle-state detector (bottom/top hysteresis), separate from the GOOD/BAD form classifier. That is not a fake model prediction, and it should be labelled as motion detection.

### 5.6 Missing integration work

- No React service or hook consumes the ONNX models.
- No React pose detector or camera lifecycle.
- No Tensor input builder in `src/`.
- No ONNX session cache.
- No camera permission/error states.
- No session summary or save-session action.
- No integration between AI sessions and workout history.
- No handling of low-confidence landmarks.
- No cleanup of camera, animation frame or MediaPipe resources on unmount.
- Model loading currently depends on external CDN imports in the standalone page.

---

## 6. Data and API status

| Data type | Current source | Persistence | Status |
|---|---|---|---|
| Auth user | Firebase Auth | Firebase | Working |
| Quick Start profile | Zustand + localStorage | Browser | Working, non-sensitive |
| Mission status/XP | Zustand + localStorage | Browser | Working |
| Mission answers | Component memory | None | Intentionally ephemeral |
| Workouts | Static `WORKOUTS` data | None | Demo only |
| Workout completion | Not implemented | None | Missing |
| Nutrition meals | Static `DAILY_MEALS` | None | Demo only |
| Hydration | Component state | None | Demo only |
| Weight/body measurements | Static arrays | None | Demo only |
| Sleep/recovery | Static `SLEEP_DATA` | None | Demo only |
| Notifications | Static `NOTIFICATIONS` | None | Demo only |
| AI form predictions | ONNX prototype only | None | Not integrated into React |
| AI sessions | Not implemented | None | Missing |

There is no existing API client, backend server, Firestore collection, or secure user-data contract to preserve. New local repositories must be clearly identified as device-local demo persistence.

---

## 7. Design weaknesses

1. **Too much micro-typography.** Labels and metadata frequently use 8–10px text. On 1440px screens it looks editorial; at 320–390px it becomes hard to read.
2. **Sample data looks real.** Weight, minutes, calories, sleep, adherence and recovery scores are visually indistinguishable from actual user data except for a small “Demo data” badge.
3. **Action hierarchy is weak.** Overview emphasizes profile completion more than today’s workout. Workouts has no start action. AI Coach has no usable action.
4. **Repeated card grammar.** Most sections are white rounded cards with the same header, icon, number and note. This reads like an admin dashboard rather than a training product.
5. **Too many unrelated statistics on the overview.** Profile completion, XP, missions, weight, active goal, weekly minutes and achievements compete for attention.
6. **AI is hidden.** The most differentiated capability is marked “Soon” and buried behind a placeholder.
7. **Mobile navigation is incomplete.** AI Coach, Lifestyle and Settings are not in the bottom bar.
8. **Charts are static and unfiltered.** No time range, no comparison, no empty state.
9. **Inconsistent sample/real state.** Some cards derive from the profile; adjacent cards are hardcoded.
10. **Limited feedback.** No loading skeletons, no save feedback on most actions, no confirmation for destructive local-data actions outside Settings.
11. **Mission progress is decorative.** The 40% in-progress bar is not derived from anything.
12. **Dashboard text is small despite generous whitespace.** There is room to increase type size and simplify.

---

## 8. Functional gaps by priority

### P0 — must work for a credible user section

- AI Coach React interface connected to the real ONNX pipeline.
- Working workout start/complete flow with a real timer and local history.
- Meal and water logging with persistent daily state.
- Measurement logging and real trend charts.
- Overview built from actual local/profile state, with honest empty states.
- Responsive sidebar/bottom navigation including AI Coach.
- Remove or clearly label all hardcoded “user” statistics.

### P1 — important polish

- Mission in-progress percentages derived from form completion.
- AI session summary saved into workout history.
- Lifestyle sleep/habit logging.
- Notification and privacy preferences in Settings.
- Skeleton loaders, toast feedback, confirmation dialogs.
- Accessible focus states, reduced-motion support and touch targets.
- Camera permission, model loading, network and inference errors.

### P2 — future backend work

- Firestore/Postgres user data and authorization rules.
- Secure medical data storage.
- Cross-device sync.
- Real coach review workflow.
- Account deletion and data export.
- Server-side AI inference or model delivery strategy.

---

## 9. Reusable components to add or extend

### Extend

- `PageHeader` — optional status/action slot, stronger responsive typography.
- `StatCard` — explicit `source` label (`live`, `local`, `sample`, `empty`).
- `DemoDataBadge` — distinct `Sample data`, `Saved on this device`, `Not enough data` variants.
- `ProgressRing` — smaller inline variant and reduced-motion handling.
- `EmptyState` — compact card variant and action slot.
- `Button` — loading state and icon-only variant.

### Add

- `SectionCard` / `DashboardCard` — one consistent surface with title, action and body.
- `SegmentedControl` — weekly/monthly, weight/body-fat filters.
- `Modal` / `ConfirmDialog` — accessible dialog shell with focus return.
- `ProgressBar` — small labelled progress with real values.
- `Skeleton` — dashboard card and chart placeholders.
- `ChartTooltip` — shared Recharts tooltip with units and source label.
- `SourceBadge` — “Saved locally”, “Sample”, “Live model”.
- `CameraStage` — video + overlay + permission/error states.
- `MetricRow` — label/value/unit row for session summaries.
- `WorkoutPlayer` — timer, exercise navigation, set tracking, completion.
- `MealDialog`, `MeasurementDialog`, `SleepDialog`.
- AI feature pipeline, model client and rep detector modules.

---

## 10. Recommended implementation order

### Stage 2 — Design foundation

1. Establish shared dashboard surfaces, source labels, empty states and typography scale.
2. Fix mobile navigation so AI Coach and all sections are reachable.
3. Add local repositories for non-sensitive demo records: workouts, meals, water, measurements, sleep, preferences, AI sessions.
4. Add accessible modal/sheet primitives and toast feedback.

### Stage 3 — Overview command center

1. Personalized hero with goal, date, streak and profile completion.
2. Today’s workout card with a real start action.
3. Four honest metrics driven by local/profile data.
4. Weekly activity chart with weekly/monthly toggle and empty state.
5. Goal progress based on mission/profile readiness, not invented weight loss.
6. Recent activity combining workout completion, mission completion and AI sessions.
7. Quick actions.

### Stage 4 — Missions and Workouts

1. Derive in-progress percentage from form completion; add milestones.
2. Make advanced unlocked assessments actionable or clearly “book with coach”.
3. Build workout player: timer, exercise navigation, set completion, rest, finish summary, save session.
4. Replace sample “today” logic with the current weekday and real local completion state.
5. Add workout history and adherence based on saved sessions.

### Stage 5 — Nutrition, Progress and Lifestyle

1. Meal logging with macros, daily totals and deletion.
2. Persistent hydration by date.
3. Measurement logging and empty-state charts.
4. Workout frequency from saved sessions.
5. Sleep logging and persistent habits.
6. Clear sample-data toggles where demo content remains necessary.

### Stage 6 — Settings

1. Editable fitness preferences.
2. Notification toggles stored locally.
3. Privacy/data summary and local reset.
4. Keep sign-out and password reset working.
5. Add honest backend limitations.

### Stage 7 — AI Coach

1. Port the verified feature pipeline from `public/model-check.html` into typed React modules.
2. Add MediaPipe and ONNX session loaders with loading/error states.
3. Build the camera stage, overlay and exercise selector.
4. Implement deterministic rep counting from pose angles.
5. Run the form model on rolling windows; show threshold, confidence and measured metrics.
6. Add timer, start/pause/stop and session summary.
7. Save completed AI sessions locally.
8. Verify parity against the existing fixture and test camera permission errors.

### Stage 8 — Integration and QA

1. Connect AI sessions and workouts to Overview/Progress.
2. Verify all routes, buttons and forms.
3. Test 1440×900, 1366×768, 1024×768, 768×1024, 390×844 and 320×568.
4. Confirm no horizontal overflow and no console errors.
5. Confirm `ml` and `public/models` are byte-identical to the audit state.
6. Produce `IMPLEMENTATION_REPORT.md` distinguishing completed, partial, demo-only and backend-dependent work.

---

## 11. Non-negotiable constraints

- Do not modify, retrain, rename, move or replace any file under `ml/` or `public/models/`.
- Do not fake AI output or present a random result as a model prediction.
- Do not store medical, medication, allergy or progress-photo data in `localStorage`.
- Keep the existing Firebase auth contract and protected-route behaviour.
- Preserve the Forge Athletic palette, fonts, logo and public marketing site.
- Every visible button must do what it says or be clearly unavailable.
- Do not claim backend persistence where only browser-local storage exists.
- Do not claim the form models are highly accurate; disclose the held-out metrics in product copy or implementation notes.
- All work and QA artifacts must remain inside `F:\Fitness Coach`.

---

## 12. Audit conclusion

The project has a strong visual base and a genuinely working offline AI prototype, but the authenticated product is not yet connected to either its best capability or its own user data flow.

The highest-value redesign is:

1. **Build the real AI Coach around the existing models.**
2. **Make workouts, nutrition, measurements and habits actually loggable.**
3. **Replace sample metrics with honest empty states and saved local data.**
4. **Simplify and strengthen the visual hierarchy so the overview is an action center, not a report.**

No source files, model artifacts or public assets were modified during this audit.
