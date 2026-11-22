# Phase 2 — Test Report

**Date:** 2026-11-23  
**Production deployment:** None  
**Test environment:** Windows, Node 22.16.0, npm 10.9.2, Chrome 157 headless

Only checks actually executed are marked PASS. Unverified items are listed separately.

---

## 1. Automated checks

| Command | Result |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** |
| `npm test` | **65 passed**, 37 rules tests skipped by design |
| `npm run test:rules` | **37 passed**, 0 failed |
| `npm run build` | **PASS** |
| `npm run verify:assets` | **PASS** (6 assets + 2 contracts) |
| `postbuild` model verification | **PASS** (public + dist) |
| `git diff --check` | **PASS** (only line-ending warnings) |
| `render.yaml` YAML parse | **PASS** |

Test files:

- `src/features/workout-recommendation/__tests__/modelInput.test.ts` — 11
- `src/features/workout-recommendation/__tests__/generator.test.ts` — 44
- `tests/model-assets.test.ts` — 10
- `tests/firestore.rules.test.ts` — 37 (emulator only)

### ESLint

There is no ESLint dependency or functional ESLint config in this repository; `eslint.config.js` is empty. The project's `lint` script is `tsc --noEmit`. ESLint was **not** run, and no lint dependency was added.

---

## 2. Production build

Command: `npm run build`

- TypeScript compile passed.
- Vite build passed.
- `postbuild` asset verification passed.
- Output: **~13 MB** (down from ~28 MB).
- No local `ort-wasm-*.wasm` asset emitted.
- Existing warning: main chunk >500 KB (511.95 KB minified).
- All six model assets present in `dist/models/`.

### Assets verified

| Asset | Result |
|---|---|
| `workout_recommendation.onnx` | PASS, 1,617,299 bytes, hash |
| `feature_schema.json` | PASS, 3,669 bytes, hash |
| `form_classifier_squat.onnx` | PASS, 373,668 bytes, hash |
| `form_classifier_bicep_curl.onnx` | PASS, 373,780 bytes, hash |
| `form_classifier_push_up.onnx` | PASS, 340,970 bytes, hash |
| `model_metadata.json` | PASS, 1,986 bytes, hash |
| Recommendation contract | PASS, 24 labels, 9 inputs, 2 outputs |
| Form contract | PASS, 60 features, BAD/GOOD, thresholds |

---

## 3. Static production preview

Served `dist/` with `vite preview` and requested each route:

| Route | HTTP |
|---|---:|
| `/` | 200 |
| `/dashboard` | 200 |
| `/dashboard/workout-recommendation` | 200 |
| `/admin` | 200 |
| `/missions` | 200 |
| `/workouts` | 200 |
| `/progress` | 200 |
| `/nutrition` | 200 |
| `/help-desk` | 200 |

This verifies Vite's SPA fallback locally, not Render's deployed rewrite.

### Production-config browser smoke

Production build with the local Firebase environment:

- `/login` rendered.
- Firebase loaded without the “not configured” notice.
- Unauthenticated `/dashboard` redirected to `/login`.
- No console errors.

No account was created and no production auth/data operation was performed.

---

## 4. Browser AI end-to-end

A second production Vite build used intentionally blank Firebase variables so the existing demo workspace could be used. The AI code, assets, runtime versions, and build pipeline are identical.

### Recommendation

| Check | Result |
|---|---|
| Demo workspace loaded | PASS |
| Page ready for generation | PASS, 1,816 ms |
| Generate click | PASS |
| Plan rendered | PASS |
| Category | `Push-Pull-Legs Split (Hypertrophy)` |
| Seven-day schedule | PASS |
| Confidence | 1.0 |
| `modelSource` | `onnx-web` |
| Browser inference time | 16 ms |
| Click-to-render | 546 ms (final run) |
| Model request | 200 |
| ORT 1.31.1 JS | 200 |
| ORT 1.31.1 WASM | 200 |
| Console errors | None |

### AI Coach

| Check | Result |
|---|---|
| Page ready | PASS |
| Start camera with fake media device | PASS |
| Camera live | PASS |
| ORT 1.19.2 JS + WASM | 200 |
| Squat classifier | 200 |
| Bicep curl classifier | 200 |
| Push-up classifier | 200 |
| MediaPipe vision bundle | 200 |
| MediaPipe WASM | 200 |
| Pose Landmarker model | 200 |
| Console errors | None |

The fake camera feed contains no human pose, so the test reached “Finding pose” but could not validate GOOD/BAD scoring, rep counting, or session save with real movement.

---

## 5. Responsive checks

At 390 × 844 CSS pixels:

| Page | Result |
|---|---|
| Recommendation | No horizontal overflow (`scrollWidth === clientWidth === 390`) |
| AI Coach | No horizontal overflow |
| Secure context | `true` on `127.0.0.1` (localhost is treated as secure) |
| Console errors | None |

This is a desktop Chrome mobile viewport, not a physical Android/iOS device.

---

## 6. Firestore rules tests

Command: `npm run test:rules`

Result: **37/37 passed**.

Coverage includes:

- Unauthenticated/private reads.
- Own vs. another member’s documents.
- Cross-user subcollection writes.
- Protected `accountStatus`/admin fields.
- Legacy active user without `accountStatus`.
- Admin role matrix.
- Inactive admins.
- Suspension and recovery path.
- Sensitive mission-answer access.
- Recommendation access.
- Valid owner recommendation write.
- Invalid schedule length.
- Unexpected recommendation field.
- Unexpected mission-answer field.
- Cross-user recommendation write.
- Collection-group sensitive reads.
- Support ticket/internal-note isolation.
- Unknown path denial.
- Support manager exclusion from content/platform.

A Phase 2 test exposed that the generic subcollection rule could bypass the specific validation. The rule was corrected to exclude the sensitive collections from generic create/update, and the suite passed afterward.

The emulator logs expected `evaluation error` lines for deliberately denied malformed writes; those tests correctly failed the write.

---

## 7. Security checks

| Check | Result |
|---|---|
| Tracked-file scan for `sb_secret_` value | PASS, none found |
| `.env.example` sanitized | PASS |
| `.env` ignored | PASS |
| No service-role key in frontend source | PASS by static inspection |
| Rules shape validation | PASS in emulator |
| Final deny-by-default | PASS |
| Recommendation authenticity | **Not verifiable by rules** — documented |
| Rules deployed to production | **NOT DONE** |

The previously exposed Supabase service-role credential still requires rotation. Removing it from `.env.example` does not revoke it.

---

## 8. Not tested / cannot be claimed

- Real Firebase signup, login, Google login, password reset.
- Real Firestore reads/writes with production accounts.
- Suspended-account behavior with a real account.
- Admin role behavior with real admin users.
- Supabase function invocation, bucket policies, upload/replace/delete.
- Production rules deployment.
- Render/Vercel deployed URL and SPA rewrite.
- Real camera and human pose scoring.
- Rep counting and AI session save after scoring.
- Physical Android/iOS devices.
- Slow network / CDN outage behavior.
- Real mobile memory usage.
- Production CDN caching and MIME behavior.
- Firebase authorized-domain behavior on a deployed host.
- Email delivery for password reset.
- Account deletion/erasure.
- Billing/quota exhaustion behavior.

These require preview deployment, real test accounts, and human approval.

<!-- phase2-test-report-complete -->
