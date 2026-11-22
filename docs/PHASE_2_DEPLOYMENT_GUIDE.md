# Phase 2 — Deployment Guide

**Project:** Forge Athletic  
**Preferred host:** Render Static Site  
**Fallback:** Vercel Hobby  
**Current stage:** Stage B prepared; Stage C/D not executed  
**Production deployment:** **NOT PERFORMED**

---

## 1. Architecture being deployed

```text
GitHub main
   │
   ├── Render Static Site (free)  ── HTTPS + SPA rewrite ──> dist/
   │       ├── React/Vite SPA
   │       ├── /models/*.onnx + JSON
   │       └── static images/fonts
   │
   ├── Firebase Auth + Firestore (client SDK)
   └── Supabase Storage + profile-image Edge Function
            ▲
            └── browser ONNX / MediaPipe runtime (no inference server)
```

No application server, SSR, Render web service, Cloud Functions, or paid AI API is required.

---

## 2. Stage A — Local production simulation (completed)

Actions performed:

```bash
npm ci                 # lockfile present; not rerun destructively
npm run lint           # tsc --noEmit
npm test
npm run test:rules     # Firestore emulator
npm run build          # tsc + vite build + postbuild asset verification
npm run verify:assets
```

Verified:

- Production build succeeds.
- `dist/models/` contains all six required assets, verified by hash.
- No unused 14.8 MB ORT WASM is emitted.
- Static preview serves `/`, `/dashboard`, `/dashboard/workout-recommendation`, `/admin`, `/missions`, `/workouts`, `/progress`, `/nutrition`, `/help-desk` with HTTP 200.
- Production-config build renders `/login`, initializes Firebase without “not configured” notice, redirects unauthenticated `/dashboard` to `/login`, and has no console errors.
- Demo-config production build loads the recommendation ONNX and generates a plan.
- Demo-config production build loads ORT + MediaPipe + all three classifiers and reaches camera live.
- 390 px viewport has no horizontal overflow.
- Local camera test is secure-context (`127.0.0.1`); production requires HTTPS, which Render provides.

Not covered in Stage A:

- Real Firebase account signup/login/writes.
- Supabase upload with a real account.
- Real human pose/form scoring.
- Physical mobile devices.
- A deployed hostname.

---

## 3. Stage B — Hosting preparation (completed in repository)

### Files

| File | Purpose |
|---|---|
| `render.yaml` | Render static-site blueprint, SPA rewrite, env var placeholders |
| `.node-version` | Pins Node 22.16.0 for Render builds |
| `package.json` `engines` | Accepts Node 20–22 |
| `vercel.json` | Existing SPA rewrite for the Vercel alternative |
| `.env.example` | Public variables + server-secret names only |
| `scripts/verify-model-assets.mjs` | Pre/post-build model integrity gate |

### Render service settings

| Setting | Value |
|---|---|
| Type | Static Site (`runtime: static`) |
| Plan | Omit — static sites are free by default |
| Branch | `main` |
| Root directory | Repository root |
| Build command | `npm ci --include=dev && npm run build` |
| Publish directory | `dist` |
| SPA rewrite | `/*` → `/index.html` |
| Auto-deploy | Blueprint/Git setting |
| Automatic dependency install | Disabled (`SKIP_INSTALL_DEPS=true`); build command installs explicitly |
| Node | `.node-version` / engines |
| HTTPS | Automatic |
| Persistent disk | None |
| Server process | None |

### Important SPA note

The rewrite must serve `index.html` only for application routes. Vite's hashed `/assets/*`, `/models/*`, `/images/*`, and `/favicon.svg` must remain directly accessible. Render's static route rewrite is configured in `render.yaml`; verify nested routes and asset loading immediately after preview deploy.

### Environment

Set all seven public `VITE_` variables in the Render dashboard. See `PHASE_2_ENVIRONMENT_CONFIGURATION.md`. Do not add Supabase service-role keys to Render.

---

## 4. Stage C — Preview deployment (requires approval)

### Render setup

1. Push the approved commit to the repository and branch Render watches.
2. In Render, choose **New → Blueprint** and select the repo.
3. Confirm it detects `render.yaml` and creates a static site.
4. Enter the seven public environment values.
5. Deploy.
6. Record the generated HTTPS URL.

If using the dashboard instead of a Blueprint:

- Environment: Static Site
- Build: `npm ci --include=dev && npm run build`
- Publish: `dist`
- Rewrite: `/*` → `/index.html`
- Add the same env vars.

### Firebase

1. Add the preview hostname to **Authentication → Authorized domains**.
2. Confirm Email/Password and Google providers as intended.
3. Keep production rules unchanged until preview smoke tests pass.
4. Do **not** deploy rules merely because a preview exists.

### Supabase

1. Confirm `profile-images` bucket and policies.
2. Confirm the function is deployed and its three secrets are set.
3. Set `VITE_SUPABASE_UPLOAD_FUNCTION_URL` to the function URL.
4. Confirm the service-role key is absent from the browser bundle.

### Preview smoke checklist

#### Static / routing

- [ ] `/` loads.
- [ ] `/login`, `/signup`, `/privacy`, `/terms` load.
- [ ] `/dashboard` redirects unauthenticated users to login.
- [ ] `/dashboard/missions`, `/dashboard/workouts`, `/dashboard/progress`, `/dashboard/nutrition`, `/dashboard/help-desk` load after login.
- [ ] Refresh on each nested route returns the SPA, not a host 404.
- [ ] `/models/workout_recommendation.onnx` returns 200.
- [ ] `/models/form_classifier_squat.onnx` returns 200.
- [ ] `/models/model_metadata.json` returns 200.
- [ ] No mixed-content or CORS errors.

#### Auth

- [ ] Email/password signup.
- [ ] Login/logout.
- [ ] Password reset.
- [ ] Session persistence after refresh.
- [ ] Google login if enabled.
- [ ] Unauthorized-domain error is absent.
- [ ] User document hydrates.
- [ ] Suspended account screen (with an admin-created test account).

#### Firestore

- [ ] Mission completion and answers persist.
- [ ] Recommendation readiness unlocks.
- [ ] Recommendation generates and saves.
- [ ] Recommendation history loads after refresh.
- [ ] Workout save/history.
- [ ] Nutrition/water.
- [ ] Progress/lifestyle.
- [ ] AI session summary save.
- [ ] Help Desk ticket create/read.
- [ ] Admin pages respect roles.
- [ ] Cross-user access is denied (use staging test accounts).

#### Browser AI

- [ ] Recommendation model loads from `/models/...`.
- [ ] ORT 1.31.1 loads from CDN.
- [ ] Recommendation returns a valid 24-class category.
- [ ] Seven-day plan renders.
- [ ] AI Coach requests camera permission over HTTPS.
- [ ] MediaPipe and ORT 1.19.2 load.
- [ ] All three classifiers load.
- [ ] Pose landmarks render.
- [ ] Good/bad scoring works with a real person.
- [ ] Rep counting works.
- [ ] Session summary saves.
- [ ] Denying camera leaves the page usable.
- [ ] Blocking CDN shows an error and does not crash the dashboard.

#### Supabase

- [ ] Upload JPEG/PNG/WebP.
- [ ] Reject >5 MB.
- [ ] Reject unsupported type.
- [ ] Replace image; old object is removed.
- [ ] Delete image.
- [ ] Public image URL renders.
- [ ] No service-role key in Network payloads/bundle.

#### Responsive

- [ ] Desktop Chrome.
- [ ] Desktop Edge.
- [ ] Android Chrome if available.
- [ ] 390 px viewport.
- [ ] Camera page on mobile.
- [ ] Slow-network model loading.

---

## 5. Stage D — Production approval

Do not publish production or change production rules without explicit human approval.

### Approval checklist

- [ ] Preview smoke tests pass.
- [ ] Real Firebase accounts verified.
- [ ] Suspended-account behavior verified.
- [ ] Supabase upload verified.
- [ ] Both AI systems verified on preview.
- [ ] Mobile verified or limitation accepted.
- [ ] Rules backup taken.
- [ ] `npm run test:rules` passes.
- [ ] Rules diff reviewed.
- [ ] Legacy recommendation shapes checked.
- [ ] Leaked Supabase service-role key rotated.
- [ ] Firebase authorized domain includes the production host.
- [ ] Free-tier usage reviewed.
- [ ] Rollback plan understood.

### Rules deployment (only after approval)

```bash
firebase deploy --only firestore:rules --project forge-11cbf
```

Do not deploy Functions, change Supabase secrets, or alter production data as part of the static-site launch.

### Production host

1. Promote/approve the Render production deploy or connect the production branch.
2. Add the production domain to Firebase authorized domains.
3. Run the smoke checklist again on the production URL.
4. Keep the preview environment for future verification.

---

## 6. Vercel alternative

1. Import the repository into Vercel.
2. Framework preset: Vite.
3. Build: `npm run build`.
4. Output: `dist`.
5. Keep `vercel.json`.
6. Add the same seven env vars to Production and Preview.
7. Add both Vercel hostnames to Firebase authorized domains.
8. Confirm Hobby terms are acceptable for the intended use.

Vercel Hobby is a personal/non-commercial plan; a commercial launch may require a paid plan. Render is preferred.

---

## 7. Rollback

### Static site

- Redeploy the previous successful commit from Render/Vercel.
- Or roll back to the previous deploy in the host dashboard.
- No database migration is involved.

### Firestore rules

1. Restore the previous rules from the backup/export.
2. Deploy them.
3. Or use Git:

```bash
git show <previous-commit>:firestore.rules > firestore.rules
firebase deploy --only firestore:rules --project forge-11cbf
```

### Environment

Restore the previous values in the host dashboard and redeploy. Vite bakes env at build time, so a restart alone is insufficient.

### Supabase

Do not delete the bucket or images. Roll back the function code/secrets only from a known-good configuration. Rotate exposed keys instead of reusing them.

### AI assets

Restore `public/models` from the approved commit. The verifier will reject unexpected changes.

---

## 8. What is ready vs. not ready

### Ready

- Static build and SPA routing configuration.
- Render blueprint.
- Vercel fallback config.
- Environment template and documentation.
- Model asset verification.
- 13 MB production output.
- Browser AI runtime proof in a production build.
- Firestore shape validation and 37 emulator tests.
- Free-service plan.

### Still requires human/manual work

- Rotate the exposed Supabase service-role key.
- Create Render service and enter env values.
- Add Firebase authorized domains.
- Deploy/verify Supabase function and bucket.
- Run real-account preview tests.
- Run real-camera AI tests.
- Test on physical mobile devices.
- Approve and deploy Firestore rules.
- Approve and publish production.

<!-- phase2-deployment-guide-complete -->
