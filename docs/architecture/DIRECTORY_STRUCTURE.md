# Forge Athletic — Directory Structure

**Project root:** `F:\Fitness Coach`  
**Generated from the repository as it exists on 2026-11-22.** Dependency internals (`node_modules`), the Python virtual environment (`workout-recommendation/.venv`), QA browser profiles, and generated `dist` files are omitted.

---

## 1. Top-level tree

```text
F:\Fitness Coach
├── .env                         # local values, gitignored; names documented only
├── .env.example                 # variable template
├── .firebaserc                  # default Firebase project forge-11cbf
├── .gitignore
├── BACKEND_AUDIT.md             # historical audit, superseded by this documentation
├── BACKEND_IMPLEMENTATION_REPORT.md
├── BACKEND_TEST_RESULTS.md
├── IMPLEMENTATION_REPORT.md
├── PROJECT_AUDIT.md             # historical audit, predates current implementation
├── firebase.json                # Firestore rules/indexes + emulator ports
├── firestore.indexes.json       # empty index list
├── firestore.rules              # deployed rules source
├── index.html                   # Vite HTML entry
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js           # design tokens
├── tsconfig.json
├── vercel.json                  # SPA rewrite to /index.html
├── vite.config.ts
├── run-model-check.bat          # Windows launcher for standalone model checker
├── docs/
│   └── architecture/            # this documentation set
├── ml/                          # existing offline ML training/evaluation code and reports
├── notebooks/                   # exercise-form notebooks
├── workout-recommendation/      # SmartFit recommendation training project + artifacts
├── public/
│   ├── favicon.svg
│   ├── images/                  # 23 marketing/product photographs
│   ├── model-check.html         # standalone form-model parity/replay checker
│   ├── model-check-fixture.json
│   └── models/                  # served ONNX and JSON artifacts
├── scripts/
│   ├── copy-model-assets.mjs    # artifact -> public/models
│   └── copy-ort-wasm.mjs        # legacy/local ORT copy helper
├── supabase/
│   ├── functions/profile-image/index.ts
│   └── storage-policies.sql
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── components/
    ├── data/
    ├── features/
    ├── hooks/
    ├── layouts/
    ├── lib/
    ├── pages/
    ├── schemas/
    ├── services/
    ├── store/
    ├── types/
    └── utils/
```

---

## 2. Important root files

| Path | Purpose |
|---|---|
| `index.html` | HTML shell; title, meta description, favicon, `/src/main.tsx` |
| `src/main.tsx` | React root; `QueryClientProvider`; imports global CSS |
| `src/App.tsx` | Router, lazy page imports, `AuthProvider`, route guards, toaster, scroll restoration |
| `package.json` | Scripts and dependencies. `predev`/`prebuild` copy recommendation artifacts into `public/models` |
| `vite.config.ts` | React plugin, dev port 5173, manual vendor chunks |
| `vercel.json` | Rewrites every path to `/index.html`; static deployment assumption |
| `firebase.json` | Firestore rules/index deployment and Auth/Firestore emulator ports |
| `firestore.rules` | The authoritative authorization source in the repository |
| `firestore.indexes.json` | No composite indexes declared |
| `.env.example` | Required public client configuration names |
| `tailwind.config.js` | Brand colors, Anton/DM Sans fonts, shadows, animations |
| `run-model-check.bat` | Starts Vite on port 5199 and opens `model-check.html` |

---

## 3. `src/` tree

```text
src/
├── App.tsx
├── main.tsx
├── index.css
├── components/
│   ├── admin/
│   │   ├── EntityManager.tsx        # generic Firestore CRUD table/modal
│   │   └── ui.tsx                   # admin shell/stat/panel/badge components
│   ├── dashboard/
│   │   ├── WorkoutPlayer.tsx        # set-by-set workout execution modal
│   │   └── ui.tsx                   # member page header/cards/badges
│   ├── layout/
│   │   ├── AdminRouteGuard.tsx      # RequireAdmin / permission gate
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminTopbar.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── DashboardTopbar.tsx      # notifications, profile menu
│   │   ├── MobileBottomNav.tsx      # six-tab member mobile nav
│   │   ├── PublicFooter.tsx
│   │   └── RouteGuards.tsx          # RequireAuth, PublicOnly, RequireOnboarding
│   ├── motion/                      # BrandIntro, ParallaxImage, RollingText
│   ├── navigation/
│   │   ├── PublicNavbar.tsx
│   │   ├── adminNav.ts
│   │   └── dashboardNav.ts
│   ├── settings/ProfilePhotoCard.tsx
│   └── ui/                          # Avatar, Badge, Button, Feedback, Logo,
│                                    # Modal, ProgressRing, SectionHeading
├── data/
│   ├── dashboard.ts                 # sample workouts, meals, targets, marketing stats
│   ├── landing.ts                   # public marketing copy/content
│   └── missions.ts                  # seven mission definitions + achievements
├── features/
│   ├── admin/
│   │   ├── access.ts                # role -> permission helpers
│   │   ├── useAdminAccess.ts        # adminUsers verification context
│   │   ├── useAdminSnapshot.ts      # aggregate Firestore snapshot
│   │   └── useModelMetadata.ts      # form-model metadata/HEAD checks
│   ├── ai-coach/
│   │   ├── types.ts                 # exercises, landmarks, metadata types
│   │   └── lib/
│   │       ├── featurePipeline.ts   # 60-feature extraction
│   │       ├── modelClient.ts       # MediaPipe + ONNX loading/scoring
│   │       └── repCounter.ts        # deterministic angle/hysteresis reps
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   └── components/              # AuthLayout, notice, Google icon
│   └── workout-recommendation/
│       ├── __tests__/               # modelInput and generator tests
│       ├── components/              # PlanSchedule, Spotlight, AI plan sections
│       ├── data/                    # exercise library, 24-category catalog, repository
│       ├── hooks/useWorkoutRecommendation.ts
│       ├── lib/                     # inference, input mapping, generator, validation, service, view helpers
│       └── types.ts
├── hooks/
│   ├── useDataStatus.ts             # cloud/local source label and errors
│   └── useSupabaseStorageHealth.ts  # bucket/function health probe
├── layouts/
│   ├── AdminLayout.tsx
│   └── DashboardLayout.tsx          # auth/profile gate, suspension screen, cloud banner
├── lib/
│   ├── constants.ts                 # brand, goals, experience, weekdays, public nav
│   ├── firebase.ts                  # guarded Firebase init + emulator wiring
│   ├── firestore.ts                 # re-export
│   ├── id.ts                        # createId(prefix)
│   ├── supabase.ts                  # Supabase client + Firebase token fetch
│   └── utils.ts                     # cn, clamp, formatting
├── pages/
│   ├── LandingPage/                 # index + 11 marketing sections
│   ├── Login/
│   ├── Signup/
│   ├── ForgotPassword/
│   ├── Onboarding/
│   ├── Legal/                       # PrivacyPage, TermsPage
│   ├── NotFound/
│   ├── Dashboard/
│   │   ├── OverviewPage.tsx
│   │   ├── MissionsPage.tsx
│   │   ├── MissionDetailPage.tsx
│   │   ├── WorkoutsPage.tsx
│   │   ├── WorkoutRecommendationPage.tsx
│   │   ├── AICoachPage.tsx
│   │   ├── NutritionPage.tsx
│   │   ├── ProgressPage.tsx
│   │   ├── LifestylePage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── HelpDesk/ (list + ticket)
│   └── Admin/                       # 18 admin pages (see FRONTEND_ARCHITECTURE)
├── schemas/
│   ├── auth.ts                      # login/signup/reset Zod schemas
│   └── quickStart.ts                # onboarding Zod schema
├── services/
│   ├── activityService.ts           # localStorage activity repository
│   ├── authService.ts               # Firebase Auth wrapper + demo session
│   ├── profileService.ts            # localStorage profile/mission repository
│   └── cloud/
│       ├── adminRepository.ts       # admin/support/content Firestore operations
│       ├── errors.ts                # friendly Firestore errors + timeout
│       ├── firestoreRepository.ts   # member Firestore operations
│       └── storageService.ts        # Supabase upload/delete + validation
├── store/
│   ├── useActivityStore.ts
│   ├── useProfileStore.ts
│   └── useRecommendationStore.ts
├── types/
│   ├── index.ts                     # shared domain types/barrel
│   ├── activity.ts
│   ├── admin.ts
│   ├── cloud.ts
│   └── support.ts
└── utils/
    ├── activity.ts                  # week/series/streak/measurement helpers
    └── missions.ts                  # status/next/achievement helpers
```

---

## 4. `ml/` — existing exercise-form model project

```text
ml/
├── build_dataset.py             # dataset construction
├── extract_pose.py              # MediaPipe landmark extraction
├── fitness_features.py          # Python feature engineering (reference implementation)
├── train_baseline.py
├── train_temporal.py
├── train_final.py
├── export_onnx.py
├── make_browser_fixture.py      # parity fixture for model-check.html
├── experiment_clip.py
├── experiment_generalization.py
├── experiment_repmetry.py
├── build_notebooks.py
├── reports/
│   ├── final_metrics.json       # per-exercise CV/val/test metrics
│   ├── summary.json             # windows/frames/videos/pose detection
│   ├── splits.json              # subject-level splits
│   ├── clip_features.parquet
│   ├── rep_features.parquet
│   ├── clip_cv_results.csv
│   ├── repmetry_cv_results.csv
│   └── univariate_auc.csv
├── dev-server.log
└── __pycache__/
```

Treat this directory as read-only. No application build step imports Python from `ml/`; the browser pipeline is a TypeScript port, and the served artifacts live in `public/models/`.

---

## 5. `workout-recommendation/` — recommendation model project

```text
workout-recommendation/
├── README.md
├── artifacts/
│   ├── workout_recommendation.onnx   # 1,617,299 bytes
│   ├── feature_schema.json
│   ├── model_metadata.json
│   ├── model_classes.json
│   ├── training_results.json
│   └── onnx_validation.json
├── data/
│   └── train-00000-of-00001.parquet  # SmartFit dataset
├── notebooks/
│   └── smartfit_training.ipynb
├── reports/
│   ├── TRAINING_REPORT.md
│   ├── EVALUATION_REPORT.md
│   ├── IMPLEMENTATION_REPORT.md
│   └── TEST_RESULTS.md
├── scripts/
│   ├── train_model.py
│   └── validate_onnx.py
└── .venv/                            # gitignored local Python environment
```

`data/` and `.venv/` are gitignored by `workout-recommendation/.gitignore`. The ONNX artifact in `public/models/` is also gitignored and is copied from `artifacts/` during `predev` and `prebuild`.

---

## 6. `public/` and external assets

| Path | Purpose |
|---|---|
| `public/images/*.jpg` | 23 static marketing/product images |
| `public/models/form_classifier_*.onnx` | Three bundled exercise-form classifiers |
| `public/models/model_metadata.json` | Form-model feature order, class order, thresholds |
| `public/models/workout_recommendation.onnx` | Served recommendation model (generated copy) |
| `public/models/feature_schema.json` | Recommendation input/output schema (generated copy) |
| `public/model-check.html` | Standalone camera/video checker and JS-vs-Python parity self-test |
| `public/model-check-fixture.json` | Frozen feature/probability fixture for parity |
| `run-model-check.bat` | Windows convenience launcher |

---

## 7. Supabase function and policies

| Path | Purpose |
|---|---|
| `supabase/functions/profile-image/index.ts` | Deno Edge Function. Verifies a Firebase ID token, then uploads/deletes a profile image with the Supabase service role. Accepts `POST`, `DELETE`, `OPTIONS`. |
| `supabase/storage-policies.sql` | Creates public-read `profile-images` bucket and owner-folder write/update/delete policies. Intended to be run manually in Supabase SQL editor. |

---

## 8. Generated, local, and excluded directories

The following are present locally but are not application source and are excluded from detailed documentation:

- `node_modules/` — installed dependencies.
- `dist/` — Vite build output (gitignored).
- `.qa/` — local browser automation artifacts (gitignored).
- `.chrome-profile/` — local Chrome profile (gitignored).
- `workout-recommendation/.venv/` — 568 MB local Python environment (gitignored).
- `ml/__pycache__/` and Python caches.
- `firestore-debug.log`, `ml/dev-server.log`, `*.mp4` — local runtime/debug artifacts.

---

## 9. Application entry points

| Entry | File | Notes |
|---|---|---|
| Browser document | `index.html` | Loads `/src/main.tsx` |
| React root | `src/main.tsx` | StrictMode + React Query provider |
| Router/app shell | `src/App.tsx` | Lazy pages, auth, guards, toaster |
| Auth state | `src/features/auth/AuthContext.tsx` | Subscribes to Firebase; hydrates stores |
| Member shell | `src/layouts/DashboardLayout.tsx` | Sidebar/topbar/mobile nav; profile/suspension gates |
| Admin shell | `src/layouts/AdminLayout.tsx` | Admin sidebar/topbar; guard outside layout |
| Firebase | `src/lib/firebase.ts` | Guarded initialization; emulator support |
| Firestore member data | `src/services/cloud/firestoreRepository.ts` | User doc + activity/mission subcollections |
| Firestore admin data | `src/services/cloud/adminRepository.ts` | Admin, support, notifications, catalog, analytics |
| Supabase | `src/lib/supabase.ts`, `src/services/cloud/storageService.ts` | Storage client and upload/delete |
| Recommendation AI | `src/features/workout-recommendation/lib/inference.ts` | ONNX session/schema loading |
| Form AI | `src/features/ai-coach/lib/modelClient.ts` | MediaPipe + three ONNX sessions |
| Recommendation generator | `src/features/workout-recommendation/lib/generator.ts` | Seven-day schedule construction |
