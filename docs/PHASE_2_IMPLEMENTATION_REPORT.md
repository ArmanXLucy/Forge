# Phase 2 — Implementation Report

**Project:** Forge Athletic (`F:\Fitness Coach`)  
**Date:** 2026-11-23  
**Branch:** `main`  
**Production deployment:** **NOT PERFORMED**  
**Overall status:** **PARTIALLY COMPLETED** — repository production-readiness is complete; deployed production verification is pending.

---

## 1. Summary

Phase 2 prepared the existing Vite/React SPA for free static hosting without moving either AI system off the browser.

Implemented:

- Render Static Site blueprint with SPA rewrite. Static sites are free by default, so no plan field is set.
- Node version pinning for reproducible host builds.
- Sanitized `.env.example`; removed a real-looking Supabase service-role value.
- Environment-variable and free-service documentation.
- Model-asset integrity verification before/after build.
- Removed an unused 14.8 MB ONNX Runtime WASM from the production bundle.
- Browser AI runtime verification for both recommendation and form detection.
- Firestore document-shape validation for mission answers and recommendations.
- Closed a generic-rule bypass that could skip the new validation.
- Stronger model-loading error messages.
- Nine Phase 2 documents including deployment and rollback procedures.

Not done:

- No production or preview deployment.
- No production rules deployment.
- No real-account Firebase/Supabase verification.
- No physical mobile/real-camera test.
- No secret rotation (requires human action).

---

## 2. Modified / added files

| File | Change | Why |
|---|---|---|
| `.env.example` | Rewritten | Removed leaked credential; added public/server-only sections with placeholders |
| `render.yaml` | New | Free Render static site, `npm ci && npm run build`, `dist`, SPA rewrite, env prompts |
| `.node-version` | New | Pin Node 22.16.0 for host builds |
| `package.json` | Scripts + engines | Added `verify:assets`, `postbuild` verification, Node engine range |
| `vite.config.ts` | Resolve condition | Use ONNX Runtime external-WASM export; remove unused local WASM |
| `scripts/verify-model-assets.mjs` | New | Verify six assets, hashes, source equality, 24/60-feature contracts, dist copies |
| `tests/model-assets.test.ts` | New | 10 tests for hashes, artifact equality, schema, metadata, pinned runtime versions |
| `tests/firestore.rules.test.ts` | Updated | Full valid recommendation/mission fixtures + negative shape tests; 37 tests total |
| `firestore.rules` | Updated | Mission-answer and recommendation shape validation; generic rule excludes sensitive collections |
| `src/features/workout-recommendation/lib/inference.ts` | Error handling | WebAssembly guard and clearer browser/deployment failure message |
| `src/pages/Dashboard/AICoachPage.tsx` | Error handling | Maps WASM/ONNX/MediaPipe/model failures to a clear retry message |
| `docs/PHASE_2_PRE_DEPLOYMENT_AUDIT.md` | New | Baseline audit |
| `docs/PHASE_2_AI_ASSET_INVENTORY.md` | New | Asset/dependency inventory |
| `docs/PHASE_2_AI_PERFORMANCE_REPORT.md` | New | Measured AI performance |
| `docs/PHASE_2_ENVIRONMENT_CONFIGURATION.md` | New | Public/server variable separation and incident |
| `docs/PHASE_2_FREE_DEPLOYMENT_BUDGET.md` | New | Free-service limitations |
| `docs/PHASE_2_FIRESTORE_PRODUCTION_SECURITY.md` | New | Rule behavior, threat model, deployment steps |
| `docs/PHASE_2_DEPLOYMENT_GUIDE.md` | New | Render/Vercel/preview/production guide |
| `docs/PHASE_2_TEST_REPORT.md` | New | Executed test results |
| `docs/PHASE_2_IMPLEMENTATION_REPORT.md` | New | This report |

No file under `ml/`, `workout-recommendation/artifacts/`, `public/models/`, or `supabase/` was modified. No model thresholds, features, categories, generator logic, UI layout, colors, navigation, auth, or database data were changed.

---

## 3. Deployment configuration

### Render

- Static site; no plan field (static sites are free by default).
- Build: `npm ci && npm run build`.
- Publish: `dist`.
- Rewrite: `/*` → `/index.html`.
- Seven public env vars declared with `sync: false`.
- Automatic HTTPS; no server process or persistent disk.

### Vercel

Existing `vercel.json` remains the alternative. Hobby is personal/non-commercial; confirm terms before a commercial launch.

### SPA

React Router remains unchanged. Local preview confirmed all published routes return the SPA. Nested route refresh on the actual host is still unverified until preview.

---

## 4. Browser AI status

### Recommendation

- Model and schema served from `/models/`.
- ORT 1.31.1 WASM from pinned jsDelivr.
- 24-class model, 9 inputs, 2 outputs unchanged.
- Plan generation, safety validation, local persistence unchanged.
- Runtime test: real plan generated in **546 ms**; browser inference **16 ms**; all model/runtime requests 200; no console errors.

### Exercise form

- MediaPipe Tasks Vision 0.10.14, ORT 1.19.2, three classifiers unchanged.
- Runtime test: camera live, all three classifiers and MediaPipe/pose model loaded with 200 responses, no console errors.
- Real human pose scoring/rep counting not tested.

### Performance

- Production output reduced from ~28 MB to ~13 MB by removing the unused locally bundled ORT WASM.
- Lazy loading and existing cleanup preserved.
- No Web Worker or model conversion introduced.

---

## 5. Firestore security status

Preserved Phase 1 controls. Added:

- Exact top-level shape validation for `mission_answers`.
- Seeded recommendation validation: ownership, 7-day schedule, allowed fields, numeric ranges, model source, generation status.
- Generic member subcollection rule no longer accepts writes to the two sensitive collections.
- Tests expanded from 34 to 37.

Validation does not prove model authenticity. A client can still fabricate a structurally valid plan in its own account. This is documented as an accepted limitation of the free browser-AI architecture.

---

## 6. Environment security

### Fixed

`.env.example` no longer contains a service-role credential or a `supabase secrets set` command with a real value.

### Still required

**Rotate the exposed Supabase service-role key immediately.** Removing it from a file does not invalidate it. Git history may retain it; rewriting history requires explicit approval and was not attempted. No production secret was changed.

---

## 7. Verification results

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm test` | 65 passed, 37 rules skipped by design |
| `npm run test:rules` | 37/37 passed |
| `npm run build` | PASS |
| `postbuild` asset verification | PASS |
| `npm run verify:assets` | PASS |
| Static preview route checks | 9/9 HTTP 200 |
| Production-config login smoke | PASS |
| Unauthenticated dashboard redirect | PASS |
| Recommendation E2E | PASS |
| AI Coach model/camera load | PASS |
| 390 px overflow check | PASS |
| Console errors | None |
| `render.yaml` parse | PASS |

Full detail: `PHASE_2_TEST_REPORT.md`.

---

## 8. Residual issues / limitations

| Issue | Status |
|---|---|
| Supabase service-role key rotation | **Blocking human action** |
| Secret may remain in Git history | Unresolved without history rewrite approval |
| Production rules not deployed | Pending approval |
| No preview/production deployment | Pending approval |
| Real Firebase auth/Firestore tests | Pending preview + test accounts |
| Supabase function/bucket/upload tests | Pending preview |
| Physical mobile/real-camera tests | Pending |
| Pose model uses `/latest/` | Documented risk |
| External CDN/model host dependency | Documented |
| Client-side plan authenticity unverifiable | Documented/accepted |
| 2.1 MB diagnostic fixture still ships | Documented |
| Main chunk >500 KB warning | Existing |
| No ESLint | Not configured; used TypeScript |
| Suspended users not checked by Supabase function | Phase 1 residual |
| Sensitive health data stored plaintext | Phase 1 residual |

---

## 9. Manual verification still required

Before production approval:

1. Rotate the Supabase service-role key.
2. Create the Render blueprint/service and enter env values.
3. Add the preview/production hostnames to Firebase authorized domains.
4. Deploy and test the Supabase function/bucket.
5. Run real-account signup/login/hydration/mission/plan/workout/help-desk tests.
6. Test suspended/admin roles with real accounts.
7. Test camera and form scoring with a real person.
8. Test Android/iOS or explicitly accept the limitation.
9. Back up and review production Firestore rules.
10. Deploy rules only after staging approval.
11. Run the preview smoke checklist in `PHASE_2_DEPLOYMENT_GUIDE.md`.
12. Approve the production deploy.

---

## 10. Rollback

### Static host

Redeploy the last successful commit or use the host's previous-deploy rollback. No DB migration involved.

### Source

```bash
git restore .env.example firestore.rules package.json vite.config.ts \
  src/features/workout-recommendation/lib/inference.ts \
  src/pages/Dashboard/AICoachPage.tsx
rm render.yaml .node-version scripts/verify-model-assets.mjs tests/model-assets.test.ts
```

Review before removing docs/tests. Do not revert Phase 1 security changes.

### Rules

Restore the previous rules export or:

```bash
git show <previous-commit>:firestore.rules > firestore.rules
firebase deploy --only firestore:rules --project forge-11cbf
```

### AI/model assets

No model changed. If a restore is needed, use the approved commit; the verifier will reject unexpected hashes.

---

## 11. Final classification

**PARTIALLY COMPLETED.**

Ready:

- Free static hosting configuration.
- Environment separation and documentation.
- Model asset integrity gate.
- Smaller production build.
- Browser AI verified in a production build.
- Firestore shape validation and tests.
- Deployment/rollback documentation.

Not ready for production until:

- The exposed Supabase key is rotated.
- A preview deployment passes real-account, Supabase, camera, and mobile tests.
- Firestore rules are approved/deployed.
- Production authorization and environment values are configured.
- Human approval is given.

No production deployment occurred.

<!-- phase2-implementation-report-complete -->
