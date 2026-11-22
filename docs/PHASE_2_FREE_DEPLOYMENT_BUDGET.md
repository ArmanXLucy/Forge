# Phase 2 — Free Deployment Budget

**Date:** 2026-11-23  
**Production spend committed:** $0  
**Paid AI inference:** None

Provider limits change. Treat the provider dashboard/pricing page as authoritative before launch. This document records the intended free architecture and the limitations that matter to Forge Athletic.

---

## 1. Service map

| Provider | Purpose | Free-plan eligible | Payment method | Required |
|---|---|---|---|---|
| Render | Static React/Vite hosting + CDN + TLS | Yes, Static Site | Not for free static | Preferred |
| Vercel | Alternative static hosting | Yes, Hobby | Not for Hobby | Alternative |
| GitHub | Source control / auto-deploy trigger | Yes | No | Yes |
| Firebase Authentication | Email/password, Google, sessions | Yes, free tier | No for Spark | Yes |
| Cloud Firestore | User, mission, activity, recommendation data | Yes, Spark quota | No for Spark | Yes |
| Supabase Storage | Profile images | Yes, Free plan | No for Free | Existing feature |
| Supabase Edge Functions | Firebase-token-verified image upload | Yes, Free plan invocation allowance | No for Free | Recommended |
| ONNX Runtime Web | Browser AI runtime | Yes, open source | No | Yes |
| MediaPipe Tasks Vision | Browser pose runtime | Yes, open source | No | Yes |
| jsDelivr | CDN for ORT/MediaPipe | Yes, public CDN | No | Yes |
| Google MediaPipe model host | Pose model download | No app charge | No | Yes |
| Custom domain | Optional branded URL | No | Usually annual | Optional |

No Firebase Cloud Functions, Render web service, Render Postgres, Redis, or paid AI API is part of the architecture.

---

## 2. Render Static Site

### Free capability

Render advertises static sites with a global CDN, automatic TLS, Git auto-deploy, and custom domains at no cost. Static sites do not sleep like free web services.

### Limitations

- Static hosting only; no server code, persistent disk, database, or secrets.
- Bandwidth/build allowances are plan/workspace dependent; check the Render dashboard.
- No SLA on the free plan.
- Build minutes/concurrency may be limited.
- Environment variables are build-time for this SPA; changing one requires redeploy.
- Preview deployments may depend on plan/workspace features.

### If a limit is exceeded

Render may throttle, pause, or require an upgrade. It should not silently charge a free static site, but confirm the current terms. The app can be moved to Vercel or Cloudflare Pages without code changes because it is a static Vite app.

### Paid alternatives

Render paid static/bandwidth or a paid CDN. Not required for launch.

---

## 3. Vercel Hobby alternative

### Free capability

Static builds, preview deployments, global CDN, TLS, and `vercel.json` rewrites.

### Important limitation

Vercel Hobby is intended for personal, non-commercial use. A public commercial fitness product may require a paid plan under Vercel's terms. Render is preferred for that reason. This is a terms issue, not a technical one.

### If a limit is exceeded

Vercel may pause deployments or require a plan upgrade. The app has no Vercel-specific server dependency.

---

## 4. Firebase Spark (Auth + Firestore)

### Free capability

- Firebase Authentication for the configured providers within the free tier.
- Cloud Firestore with a daily no-cost quota and 1 GiB total stored data on Spark.
- No Cloud Functions on Spark (not used by this app).
- Firebase Hosting is not used; the SPA is on Render.

### Limitations to watch

- Firestore daily read/write/delete quotas. Mission answers, recommendation history, and activity hydration can consume reads.
- 1 GiB total storage; includes recommendation snapshots and sensitive mission answers.
- Network egress quota.
- No built-in automated backups on Spark.
- Auth quotas/MAU terms should be confirmed in the Firebase console.
- Quota exhaustion can make reads/writes fail; the app has local/demo fallback for some paths but cloud sync will fail.

### If a quota is exceeded

Firestore operations can fail until the quota resets or the project is upgraded to Blaze. Blaze has no-cost allowances but requires a billing account and can incur charges. **Do not upgrade automatically.**

### Cost controls

- Keep recommendation history bounded.
- Avoid hydrating every collection on every page.
- Do not add polling or analytics loops.
- Monitor Firebase usage before launch.

---

## 5. Supabase Free (Storage + Edge Function)

### Current free-plan characteristics (verified from Supabase pricing on 2026-11-23)

- 2 free projects.
- 500 MB database size.
- 1 GB file storage.
- 5 GB egress.
- 500,000 Edge Function invocations included.
- Free projects are **paused after 1 week of inactivity**.
- Shared CPU / 500 MB RAM for the free database; functions have cold starts.

Forge Athletic uses only Storage and one Edge Function. It does not use Supabase Auth or the database.

### Limitations

- 1 GB image storage; profile images are capped at 5 MB each.
- 5 GB egress can be consumed by repeated public image views.
- Free project pause can break profile-image upload until the project is resumed.
- Edge Function cold starts add latency.
- CORS is currently `*`; the function is public but requires a valid Firebase token.
- The function does not check suspended status (documented Phase 1 gap).

### If a limit is exceeded

Uploads may fail or the project may be restricted. Supabase may require a paid plan for overages. No automatic paid upgrade is configured.

### Cost controls

- Keep the 5 MB per-image limit.
- Delete replaced images (the function does).
- Avoid serving full-resolution images repeatedly; existing UI can be optimized later.

---

## 6. Browser AI — no inference bill

| Component | Cost |
|---|---|
| Recommendation ONNX inference | $0, user CPU |
| Pose landmarker inference | $0, user CPU/GPU |
| Form classifiers | $0, user CPU |
| CDN downloads | $0 to the project on jsDelivr |
| Pose model download | $0 to the project; hosted by Google |

The trade-off is user bandwidth/CPU and a large first download (pose model ~9.4 MB). There is no AI API key, credit system, or mandatory paid backend.

---

## 7. Domain, email, and other optional costs

| Item | Cost | Required |
|---|---|---|
| Custom domain | Usually annual registrar fee | Optional |
| DNS | Free at most registrars | Optional |
| Transactional email | None connected | Not required |
| Monitoring/analytics | None connected | Not required |
| Paid APM | None | Not required |

The app does not currently send email. Password reset relies on Firebase's configured email delivery.

---

## 8. What happens if something is unavailable

| Failure | User impact | App still usable? |
|---|---|---|
| Render outage | App unreachable | No |
| Firebase quota/auth outage | Cloud sync/login fails | Demo/local fallback for some paths |
| Supabase project paused | Profile-image upload fails | Yes |
| jsDelivr blocked | AI models cannot initialize | Rest of dashboard yes |
| Pose model host blocked | AI Coach pose fails | Yes |
| Firestore rules undeployed/misconfigured | Cloud writes fail | Local/demo paths may continue |
| CDN cold cache | Slower first AI load | Yes |

---

## 9. Recommended configuration

1. Render Static Site, free plan.
2. Firebase Spark with existing `forge-11cbf` project.
3. Supabase Free, existing bucket/function.
4. Browser AI only.
5. GitHub as deployment source.
6. No custom domain until the preview is approved.
7. No paid services until usage measurements justify them.

**Estimated mandatory monthly cost at launch: $0**, excluding optional domain registration.

<!-- phase2-free-deployment-budget-complete -->
