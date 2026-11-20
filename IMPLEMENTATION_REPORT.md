# Forge Athletic — Implementation Report

**Scope:** authenticated user dashboard (`/dashboard/*`) and the browser AI Coach  
**Project root:** `F:\Fitness Coach`  
**Status:** implemented, built and browser-tested

---

## 1. What changed

### Dashboard design system

The authenticated area now uses a consistent premium athletic system:

- Charcoal navigation rail, warm ivory page background, white cards, orange accents.
- Shared `PageHeader`, `SectionCard`, `StatCard`, `SourceBadge`, `SegmentedControl`, `ProgressBar` and `Modal` primitives.
- Display typography restored to the heavy Anton uppercase treatment used by the brand (matching the approved reference).
- Consistent card borders, spacing, hover states, focus states, button hierarchy and responsive grids.
- Data provenance is shown on-screen (`Saved on this device`, `Sample plan`, `Live`, `Not enough data`).
- Scrollbar-free sidebar navigation with all primary items reachable on short laptop screens.
- Dashboard content is centred with a max width of 1500px so ultra-wide screens do not produce stretched rows.

### Sidebar scrollbar fix

The sidebar was inspected before changing CSS:

- The nav column is a flex child with `min-h-0`, `overflow-y-auto`, `overscroll-contain` and a hidden scrollbar (`.hide-scrollbar`).
- `scrollbar-width: none`, `-ms-overflow-style: none` and `::-webkit-scrollbar { display: none }` are applied without disabling scrolling.
- Navigation spacing was reduced from 44px to 42px per item; the large support promo card was replaced with a compact “Coach support” row.
- The optional support row is hidden below 760px viewport height so every primary nav item fits on 1280×720 and 1366×768.
- The profile/footer block is outside the scroll area and can no longer be clipped.
- Verified: at 1440×900, 1366×768 and 1024×768 the nav has `scrollHeight === clientHeight`; computed `scrollbarWidth: none`; no horizontal overflow.
- Mouse wheel, touch scrolling, keyboard focus and bottom navigation remain functional.

### Pages redesigned

| Page | Main changes |
| --- | --- |
| **Overview** | Command-centre hero with goal headline, profile ring and next mission; today’s session card; quick actions; live local stats; weekly/4-week chart with empty state; goal progress; recent activity; achievements; disclaimer. |
| **My Missions** | Profile-strength summary, next recommended mission, real `answeredFields/totalFields` progress, completed/available states, booking link for advanced assessments. |
| **Mission Detail** | Consistent header, safety notices, sticky-free action bar on mobile (no field overlap), live field progress, confirmation modal for completion. |
| **Workout Plans** | Next-session hero, weekly calendar driven by real completion dates, expandable exercises, plan library, local history, modal workout player with timer, sets, rest timer and save/discard. |
| **AI Coach** | Real MediaPipe pose tracking + per-exercise ONNX classifier, camera/video input, skeleton overlay, rep detector, rolling model windows, measured cues, error/framing guidance, session save. |
| **Nutrition** | Date navigation, macro totals, meal log with add/delete, hydration grid, weekly calorie chart, reference-target disclosure. |
| **Progress** | Real measurement stats and trends, metric/range controls, measurement dialog, latest records, workout frequency, AI-session history, secure-photo placeholder. |
| **Lifestyle** | Sleep/steps/stress/habit stats, recovery check-in dialog, sleep chart, daily habit checklist persisted per date, recovery notes. |
| **Settings** | Profile summary, preferences/notifications with accessible switches, Firebase status, account actions, local data summary, confirmed profile and activity resets. |

All routes remain protected by the existing auth guard. Sign-out, demo mode and Firebase authentication are unchanged.

---

## 2. AI Coach — implementation and camera fix

### Real integration

The AI Coach uses the existing, unchanged model artifacts:

- `public/models/form_classifier_squat.onnx`
- `public/models/form_classifier_bicep_curl.onnx`
- `public/models/form_classifier_push_up.onnx`
- `public/models/model_metadata.json` (60-feature contract, class order `["BAD","GOOD"]`)

No model was retrained, renamed, replaced or modified. SHA-256 after implementation:

```text
84a84bc130159a403765be9d44d72f87af46e6e19bf74e193694cf7cefe6aa97  form_classifier_squat.onnx
23bfeb8495b9e942059c862d41ea6929b17fe6a87b44ffbe044a2e3927110d44  form_classifier_bicep_curl.onnx
18fb7cde7ac4d747d02dbfed87e6cff76e06efa8b78bebcb8aa963b81cece0e7  form_classifier_push_up.onnx
ed1c8750fe61d6401918ece9e32560766969e6f54cf518ff1375142f595f02f8  model_metadata.json
```

The browser feature pipeline remains parity-matched to the verified Python pipeline. Latest parity run:

| Exercise | Max feature delta | Vector length |
| --- | ---: | ---: |
| Squat | 0.00575 | 60 |
| Bicep curl | 0.01129 | 60 |
| Push-up | 0.00268 | 60 |

Latest ONNX output from the React client on the parity fixture:

| Exercise | p(GOOD) | Threshold |
| --- | ---: | ---: |
| Squat | 0.461 | 0.66 |
| Bicep curl | 0.505 | 0.64 |
| Push-up | 0.294 | 0.58 |

These are real model outputs, not hardcoded verdicts. The UI discloses that held-out accuracy is modest and treats the classifier as a secondary signal.

### Camera detection bug found and fixed

Two concrete defects caused “camera works but the model never detects”:

1. **Every exercise required all 14 body landmarks, including feet.**  
   Bicep curl is explicitly framed waist-up, so the feet are not in frame; the readiness check could therefore never pass. Squat/push-up also dropped every frame when either ankle was hidden.
2. **The cached pose landmarker was closed on page unmount without clearing its module cache.**  
   After navigating away from AI Coach and returning, the next session reused a closed landmarker. Detection silently produced no landmarks because per-frame errors were swallowed.

Fixes implemented:

- Per-exercise required landmark sets:
  - Squat: shoulders, hips, knees, ankles.
  - Curl: shoulders and elbows (waist-up friendly).
  - Push-up: shoulders, elbows, hips, knees, ankles.
- Readiness now requires 80% of the required joints at visibility ≥ 0.25, instead of 100% at 0.35.
- The pose landmarker is kept alive at module level and reused across route changes; it is no longer closed by component cleanup.
- The UI now distinguishes:
  - `Finding pose` — no person detected.
  - `Adjust framing` — pose found, required joints missing.
  - `Pose tracked` — ready to sample.
- A clear amber callout explains what to change in the camera framing.
- Readiness is reported as a percentage of sampled frames.
- The camera permission / HTTPS / localhost requirement is disclosed in the “Before you start” checklist.
- Frame errors are still isolated per detection; one failed frame does not end the session.

### AI verification performed

- Simulated-camera test in Chrome (fake capture device, push-up image sequence):
  - Pose tracked, skeleton overlay drawn.
  - Model windows scored; p(GOOD) ≈ 35%.
  - 24 sampled frames, 89% readiness in the earlier run.
- Simulated-camera test (curl, waist-up image):
  - Pose tracked; model window scored p(GOOD) ≈ 56% against the 64% threshold.
- Camera navigation/remount test:
  - First session: pose tracked, score produced.
  - Navigate to Overview → return to AI Coach → second session: pose tracked, score produced, no console errors.
- Rep detector unit test with synthetic angle cycles: 5/5 reps for squat, curl and push-up.
- Camera permission denial path returns the existing actionable error message.
- A physical webcam was not available in the automated environment; final real-webcam validation remains a manual device check.

---

## 3. Functional verification

Browser tests completed in Chrome against `http://127.0.0.1:5174` (demo auth) and the production build:

- Auth guard: signed-out `/dashboard` redirects to `/login`.
- Sidebar drawer opens; all dashboard nav links remain reachable.
- Workout player opens from Workout Plans and from the Overview start link.
- Meal dialog: saved a meal, count increased, record survived reload.
- Measurement dialog: saved 76.5 kg, record survived reload and appeared in the UI.
- Settings preference switch: changed state, persisted to the activity store, survived reload.
- Empty activity state: chart renders “No training logged yet”, no overflow, no errors.
- Source labels are present for local/sample/empty data. No backend persistence is claimed.

### Responsive results

Automated sweep: **104 authenticated page checks** = 8 dashboard pages × 13 viewports:

`1280×720`, `1366×768`, `1440×900`, `1600×900`, `1920×1080`, `768×1024`, `820×1180`, `1024×768`, `320×568`, `375×667`, `390×844`, `393×852`, `430×932`.

Result: **0 horizontal overflows**, **0 missing page H1s**, **0 console errors**.

A further 27 checks covered Mission Detail plus final typography at 1440/390/320 with 0 overflows.

### Build

```text
npx tsc --noEmit   → clean
npm run build      → success
```

---

## 4. Components created / modified

**Created or substantially extended**

- `src/features/ai-coach/types.ts`
- `src/features/ai-coach/lib/featurePipeline.ts`
- `src/features/ai-coach/lib/modelClient.ts`
- `src/features/ai-coach/lib/repCounter.ts`
- `src/types/activity.ts`
- `src/services/activityService.ts`
- `src/store/useActivityStore.ts`
- `src/utils/activity.ts`
- `src/lib/id.ts`
- `src/components/dashboard/WorkoutPlayer.tsx`
- `src/components/dashboard/ui.tsx` (`SectionCard`, `SegmentedControl`, `ProgressBar`, `SourceBadge`)
- `src/components/ui/Modal.tsx`

**Reworked**

- All eight dashboard pages listed above.
- `src/components/layout/DashboardSidebar.tsx`
- `src/components/layout/DashboardTopbar.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/layouts/DashboardLayout.tsx`
- `src/store/useProfileStore.ts`
- `src/features/auth/AuthContext.tsx`
- `src/components/navigation/dashboardNav.ts`
- `src/index.css`

---

## 5. Data and backend status

- **Auth:** existing Firebase Auth is preserved. Demo mode remains available when Firebase env vars are absent.
- **Profile/missions:** browser-local, namespaced by UID (`forge:v1:profile:<uid>`, `forge:v1:missions:<uid>`).
- **Activity:** browser-local (`forge:v1:activity:<uid>`), covering workouts, meals, hydration, measurements, recovery, habits and AI session summaries.
- **No backend/database sync was added.** There is still no Firestore/Postgres layer, no cross-device sync and no secure server-side medical storage.
- Sensitive mission answers remain ephemeral; medical data, medications, allergies, health documents and photos are not written to localStorage.
- The UI explicitly labels local-only data and never presents it as server-synced.

---

## 6. Known limitations / remaining work

1. **No secure backend.** Activity and profile data live on one browser/device only. Production needs a real database, authenticated APIs and server-side validation.
2. **AI accuracy is modest** (held-out squat/curl ≈ 0.50, push-up ≈ 0.625). The model is presented as a secondary signal, not a diagnosis or coach replacement.
3. **Camera needs localhost or HTTPS.** If access is blocked by browser policy, the UI explains the failure and offers video upload as an alternative.
4. **Framing still matters.** Squat and push-up require the lower body in frame; curl works waist-up. The UI now gives explicit framing feedback instead of silently failing.
5. **Model assets load from CDN at runtime.** `onnxruntime-web` and MediaPipe are fetched from jsDelivr; the ONNX weights are local. Offline use of the AI Coach would require self-hosting those runtime assets.
6. **No medical/health-data storage.** Secure document and photo upload is intentionally still a placeholder.
7. **Progress photos, device notifications and account deletion** remain future-stage features and are labelled unavailable rather than faked.
8. **Physical webcam test** is still required on the target device/browser; automated verification used Chrome’s fake capture device.

---

## 7. Run

```bash
cd "F:\Fitness Coach"
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Demo entry appears when Firebase environment variables are not configured. With Firebase configured, use the normal login/signup flow.

Production build:

```bash
npm run build
npm run preview
```
