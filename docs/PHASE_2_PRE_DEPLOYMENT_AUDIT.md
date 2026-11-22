# Phase 2 — Pre-Deployment Audit

**Project:** Forge Athletic  
**Root:** `F:\Fitness Coach`  
**Audit date:** 2026-11-23  
**Branch:** `main`  
**Base commit:** `c246ad7 new workout section added`  
**Phase 1 state:** Completed in the working tree, not committed, rules not deployed.

> This audit was completed before Phase 2 application/config changes. It records the repository exactly as found. No production deployment was performed.

---

## 1. Deployment readiness summary

| Area | State | Readiness |
|---|---|---|
| React/Vite production build | Passing | Ready |
| TypeScript | Passing | Ready |
| Existing unit tests | 55 passing | Ready |
| Firestore rules tests | 34 passing in Phase 1 (emulator) | Ready locally; deployment pending |
| SPA source routing | React Router configured | Ready |
| Vercel SPA rewrite | Present | Alternative available |
| Render Static Site config | Absent | **Needs configuration** |
| Environment template | Present but contains a leaked secret | **Blocking security fix** |
| Firebase web config | Present locally | Host variables still needed |
| Firestore rules deployment | Not deployed | Human approval required |
| Recommendation ONNX | Present and verified in Phase 1 | Ready |
| Form classifiers | Present in `public/models` | Ready |
| MediaPipe / ORT CDN access | Runtime external | Needs production verification |
| Supabase function | Source present; deployment not verified | Needs production verification |
| Production auth-domain allowlist | Not verified | Needs human console check |
| Production deployment | None | Awaiting approval |

**Overall:** technically deployable after environment sanitization and host configuration. Production AI, auth, and Supabase verification cannot be completed until a preview URL exists.

---

## 2. Git and working-tree state

- Branch: `main`
- HEAD: `c246ad7 new workout section added`
- Uncommitted Phase 1 changes: `firestore.rules`, `package.json`, 10 source files, `docs/`, `tests/`.
- These changes must be preserved. Phase 2 is additive on top of them.
- No Phase 2 deployment branch or commit was created during the audit.

---

## 3. Current hosting configuration

### Vercel — present

`vercel.json` rewrites every path to `/index.html`. This is suitable for the SPA, but the current project has no Vercel project linkage file and deployment has not been tested.

### Render — absent

There is no `render.yaml`, no Render build command, and no Render SPA rewrite. A static-site blueprint is required.

### Other hosting

No Netlify, Cloudflare Pages, GitHub Pages, or Docker deployment configuration was found.

### Build output

- Build command: `npm run build` (`tsc --noEmit && vite build`)
- Publish directory: `dist`
- Package manager: npm with `package-lock.json` (lockfile v3 era; Node 22/npm 10.9 locally)
- SPA fallback needed for `/dashboard`, `/admin`, `/missions`, `/workouts`, `/progress`, `/nutrition`, `/help-desk`, and nested detail routes.

---

## 4. Existing AI architecture

### A. Workout recommendation — browser ONNX

- Model: `public/models/workout_recommendation.onnx` (1,617,299 bytes).
- Schema: `public/models/feature_schema.json` (24 target labels).
- Runtime: `onnxruntime-web/wasm` imported by `src/features/workout-recommendation/lib/inference.ts`.
- WASM path: pinned jsDelivr CDN, `onnxruntime-web@1.31.1`.
- Model fetch: root-relative `/models/workout_recommendation.onnx`.
- Preprocessing: live in `modelInput.ts`; 9 ONNX inputs; BMI derived; 24-class output.
- Generation: local `generator.ts`, catalog, 80+ exercise library, safety validator.
- Persistence: client writes to `users/{uid}/workout_recommendations` and mission answers to `users/{uid}/mission_answers`.
- Lazy-loading: `preloadWorkoutModel()` called when the recommendation page mounts; the inference module itself is dynamically imported during generation.

### B. Exercise-form detection — MediaPipe + browser ONNX

- Pose: MediaPipe Tasks Vision 0.10.14 from jsDelivr; pose model from Google Cloud Storage (`pose_landmarker_full.task`, `/latest/` path).
- Runtime: ONNX Runtime Web 1.19.2 loaded dynamically from jsDelivr.
- Classifiers: squat (373,668 B), bicep curl (373,780 B), push-up (340,970 B).
- Metadata: `public/models/model_metadata.json`; 60-feature order; thresholds 0.66/0.64/0.58; classes `[BAD, GOOD]`.
- Feature pipeline and rep counter are local browser modules.
- Camera frames and landmarks remain in memory; sessions persist summaries only.
- Loading is lazy: models load when the user starts a camera/video session.
- Failure behavior: load errors are caught in `AICoachPage` and shown in the existing error panel; the rest of the dashboard remains usable.

### Model files

| Asset | Bytes | Tracked | Loaded by |
|---|---:|---|---|
| `workout_recommendation.onnx` | 1,617,299 | Yes | Recommendation |
| `feature_schema.json` | 3,669 | Yes | Recommendation |
| `form_classifier_squat.onnx` | 373,668 | Yes | AI Coach |
| `form_classifier_bicep_curl.onnx` | 373,780 | Yes | AI Coach |
| `form_classifier_push_up.onnx` | 340,970 | Yes | AI Coach |
| `model_metadata.json` | 1,986 | Yes | AI Coach |

`prebuild` runs `scripts/copy-model-assets.mjs`, which copies the recommendation model and schema from `workout-recommendation/artifacts/` into `public/models/`. `public/models/workout_recommendation.onnx` and `feature_schema.json` are both tracked and also ignored in `.gitignore`; tracking already exists, so builds work, but this is a confusing source-of-truth setup.

---

## 5. Build and asset observations

Baseline production build (`npm run build`) succeeded in ~19 seconds. `dist/` was ~28 MB:

| Output | Approx. size | Notes |
|---|---:|---|
| `dist/assets/*` | 17 MB | Includes a 14.8 MB `ort-wasm-simd-threaded-*.wasm` |
| `dist/images/*` | 5.6 MB | Existing site photography |
| `dist/models/*` | 2.7 MB | Production model assets |
| `dist/model-check-fixture.json` | 2.1 MB | Diagnostic fixture |
| `dist/model-check.html` | 28 KB | Diagnostic page |
| Main JS chunk | 512 KB minified | Existing >500 KB warning |

### Unused ORT WASM

`inference.ts` sets `ort.env.wasm.wasmPaths` to the CDN, but Vite resolves the default `onnxruntime-web/wasm` bundle export and emits the 14.8 MB bundled WASM into `dist/assets`. The emitted binary is not used when `wasmPaths` points at the CDN. Removing it is a safe build-time optimization if runtime verification passes.

### Other diagnostics

`public/model-check.html` and its 2.1 MB fixture are development/verification utilities. They are included in production by Vite's `public/` copy. This is not required for the application and is a candidate for exclusion, but removing it could remove a useful parity diagnostic. Documented, not removed during audit.

---

## 6. Environment configuration

### Public variables used by the frontend

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_UPLOAD_FUNCTION_URL`
- `VITE_USE_FIREBASE_EMULATORS` (local development only)

All eight were present in the local `.env` (emulator flag empty). No values were printed during the audit.

### Server-only secrets

- `FIREBASE_PROJECT_ID`
- `STORAGE_URL`
- `STORAGE_SERVICE_ROLE_KEY`
- Optional Supabase platform fallback `SUPABASE_SERVICE_ROLE_KEY`

These are used only by `supabase/functions/profile-image/index.ts`.

### Critical finding — tracked secret exposure

`.env.example` is tracked by Git and contains comments with a real-looking Supabase service-role credential and a `supabase secrets set` command. The value was redacted from all audit output and must not be reproduced. `.env` is ignored, but the example file's presence in Git history means:

1. The credential must be treated as compromised and rotated in Supabase.
2. The example file must be sanitized immediately.
3. Git history may retain the value; removal from history requires a coordinated, potentially destructive rewrite and human approval.
4. Firebase web API keys are public identifiers, but Supabase service-role keys are not.

This is the highest-priority Phase 2 security issue.

---

## 7. Firebase configuration

- Project ID: `forge-11cbf` (from `.firebaserc`).
- Firebase initialized only when all four public web values exist; otherwise the app exposes demo mode.
- Auth: email/password, Google popup provider, password reset, persistence via Firebase SDK.
- Firestore: client SDK, user-scoped repositories, offline/local cache fallback.
- Emulator connections are guarded by `import.meta.env.DEV`.
- Rules: Phase 1 hardened rules are present but **not deployed**.
- No Firebase Storage usage.
- No Cloud Functions dependency.
- No Firestore composite indexes beyond the default file.

### Production checks still required

- Authorized domains include the production/preview host.
- Google provider enabled if that button is exposed.
- Email/password provider enabled.
- Password-reset action URL/domain behavior.
- Production rules deployment after staging tests.
- Real-account hydration, writes, and suspension behavior.

---

## 8. Supabase configuration

`supabase/functions/profile-image/index.ts`:

- Firebase ID token required.
- JWT verified with Google X.509 certificates, issuer and audience.
- UID taken from verified `sub`.
- File path generated server-side under `{uid}/`.
- MIME allowlist and 5 MB size limit.
- Service-role key kept server-side.
- CORS is `*`; bucket is public-read; suspended users are not checked.

Client upload prefers the Edge Function and falls back to direct Supabase upload only if configured. No service-role key is used in the browser.

### Production checks still required

- Function deployed at `VITE_SUPABASE_UPLOAD_FUNCTION_URL`.
- Function secrets configured (names only).
- `profile-images` bucket exists and is public.
- Storage policies from `supabase/storage-policies.sql` applied.
- Upload/replace/delete/retrieval tested on preview domain.
- Bucket public URL remains valid.

---

## 9. Firestore security and browser AI limitations

Phase 1 controls are intact in the working tree:

- Owner isolation.
- Suspension enforcement.
- Protected admin fields.
- Sensitive answers/recommendations limited to user-management admins.
- Support isolation.
- Deny-by-default.
- 34 emulator tests.

Known limitations:

- Recommendation documents remain client-writable because inference is browser-side.
- Firestore rules can validate shape and ownership but cannot prove that genuine ONNX inference produced a plan.
- `confidence`, `modelVersion`, safety summaries, and class probabilities are client assertions.
- Mission answers and recommendation snapshots contain sensitive health context.
- A malicious client can still write a structurally valid but fabricated recommendation into its own account.
- No server-side rate limiting.

Phase 2 can restrict field shape and mutation surface, but must document that authenticity is not cryptographically verified.

---

## 10. AI loading and performance observations

### Recommendation

- Model is fetched only on the recommendation page/preload.
- Session and schema are cached in module promises.
- No duplicate model downloads after first success.
- Failed loads clear the cached promise, so retry is possible.
- Inference is single-threaded WASM (safe for static hosting/COOP constraints).
- Model + WASM are external/CDN plus same-origin model; first generation can be slower on cold cache.
- UI error path exists. No explicit retry button; regenerating retries.
- No Web Worker; model is ~1.6 MB and inference is sub-millisecond class prediction, so not justified.

### AI Coach

- Three classifier sessions load in parallel with `Promise.all`.
- MediaPipe pose model and two CDN runtimes load on first session.
- Camera sampling is throttled to ~15 detections/sec; feature samples ~10/sec; scoring ~every 1.8s.
- Frames are capped at 600; scoring uses the last 180.
- Pose landmarker is intentionally reused across visits.
- GPU delegate falls back to CPU.
- Camera stream, animation frame, and object URL are cleaned up on stop/unmount.
- ONNX sessions have no explicit release API; they are garbage-collected with the page.
- No session-level memory measurement was possible without browser instrumentation.

### Risks

- First AI Coach load depends on two CDNs and one Google model URL.
- MediaPipe pose model uses a `/latest/` URL rather than an immutable version.
- ORT 1.19.2 and 1.31.1 are both pinned but are different versions in the same app.
- Slow networks/mobile devices may take several seconds to initialize.
- No service worker/offline cache for models.
- No integrity metadata or SRI on dynamic imports (SRI is impractical for dynamic ESM CDN imports).

---

## 11. Production verification gaps

Cannot be verified until a preview deployment exists:

- Production model URLs and MIME/CORS behavior.
- CDN availability from the deployed origin.
- Camera permissions over the preview HTTPS domain.
- MediaPipe/pose model loading on the preview.
- Firebase authorized-domain behavior.
- Firestore reads/writes with real accounts.
- Supabase function and bucket behavior.
- Nested route refreshes on Render.
- Mobile package/model download behavior.

Local verification can cover build, tests, route fallback under a static server, demo mode, asset presence, and model loading with the existing environment.

---

## 12. Prioritized Phase 2 work

### Must do before deployment

1. Remove the tracked secret from `.env.example`; document rotation.
2. Add a Render static-site blueprint with SPA fallback.
3. Add model-asset verification (public and `dist`).
4. Remove the unused local ORT WASM from production output if behavior is unchanged.
5. Add automated model/schema asset tests.
6. Restrict recommendation and mission-answer document shape/mutable fields in Firestore rules without breaking generation.
7. Add corresponding rules tests.
8. Prepare environment-variable deployment documentation with no secret values.
9. Run production preview, route-refresh, demo, and AI loading checks.
10. Document free-plan limits and every unverified production dependency.

### Verify after preview, before production approval

- Firebase auth/provider/authorized domains.
- Firestore rules deployment and real-account isolation.
- Supabase function/bucket upload and image retrieval.
- Camera and both AI systems on the preview.
- Mobile and slow-network behavior.

### Out of scope / no change

- Model retraining, conversion, quantization, thresholds, feature order, categories.
- Backend inference or mandatory API.
- Firebase/Supabase migration.
- UI redesign.
- Production deployment without approval.

---

## 13. Audit conclusion

The application is structurally ready for static hosting. The blocking repository issue is the leaked service-role credential in the tracked environment example. The largest safe production optimization is removing the unused locally bundled ONNX Runtime WASM. Browser AI logic is already lazy and failure-tolerant, but production proof requires a preview URL and human-approved environment/Firebase/Supabase configuration.

<!-- phase2-pre-deployment-audit-complete -->
