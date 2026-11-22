# Forge Athletic — Security Architecture

> **Phase 1 update (2026-11-22):** Firestore active-owner/suspension checks and role-scoped sensitive reads were implemented in `firestore.rules` and verified by 34 emulator tests. They are **not deployed** to production. See `docs/PHASE_1_IMPLEMENTATION_REPORT.md` and `docs/PHASE_1_SECURITY_TEST_REPORT.md`. Some statements below describe the pre-Phase-1 audit baseline.

---

## 1. Security model summary

| Boundary | Mechanism | Status |
|---|---|---|
| Member identity | Firebase Authentication | IMPLEMENTED |
| Member data authorization | Firestore rules owner checks | IMPLEMENTED |
| Admin identity | Same Firebase Auth session | IMPLEMENTED |
| Admin authorization | `adminUsers` role + active flag in rules | IMPLEMENTED |
| UI route protection | React route guards | IMPLEMENTED (convenience, not the boundary) |
| Profile image authorization | Firebase JWT verification in Supabase Edge Function + UID-prefixed paths | IMPLEMENTED (deployment-dependent) |
| Profile image public read | Supabase public bucket policy | IMPLEMENTED |
| Server-side input validation | none for member/admin data; image validation only | GAP |
| Suspended-account enforcement at data layer | Firestore active-owner rules (Phase 1) | IMPLEMENTED IN REPO; DEPLOYMENT PENDING |
| Recommendation plan integrity | client-generated and client-writable | GAP |
| Medical/mission data protection | owner-only Firestore rules + localStorage copy | PARTIAL / GAP |
| Secret management | only public client keys in `.env`; service role only in Edge secrets | IMPLEMENTED IN SOURCE |

---

## 2. Authentication

### Providers

- Email/password.
- Google popup.
- Password reset email.
- Local demo session (no Firebase account).

### Properties

- Firebase client SDK; no session cookies or custom backend sessions.
- Auth state is observed by `AuthProvider` via `onAuthStateChanged`.
- No email-verification requirement before dashboard access.
- No MFA requirement.
- No account lockout logic beyond Firebase’s own rate limits.
- Password policy is enforced client-side by the signup Zod schema: ≥8 chars, at least one letter and one digit. Firebase may enforce its own server policy.
- Demo mode is blocked from admin access and profile-photo upload.
- Sign-out clears local profile/activity stores and the demo marker.

### Demo-session caveat

`startDemoSession()` writes a localStorage marker, and `authService.subscribe()` treats it as an authenticated local session. This is intentional for the demo. It must not be confused with a real Firebase account and does not grant Firestore access.

---

## 3. Firestore authorization

Source: `firestore.rules`.

### Helper model

```text
signedIn()       request.auth != null
isOwner(uid)     signedIn && request.auth.uid == uid
isAdmin()        adminUsers/{auth.uid}.active == true
hasRole(roles)   isAdmin && adminUsers/{auth.uid}.role in roles
```

Role helpers:

| Helper | Roles |
|---|---|
| `canManageUsers` | super_admin, admin |
| `canManageRoles` | super_admin |
| `canManageContent` | super_admin, admin, fitness_manager |
| `canSupport` | super_admin, admin, support_manager |
| `canViewAnalytics` | super_admin, admin, fitness_manager, support_manager, analyst |
| `canManagePlatform` | super_admin |

### Member ownership

- `users/{uid}`: owner get/list/update/delete, subject to protected fields.
- `users/{uid}/**`: owner read/create/update/delete.
- `mission_answers` and `workout_recommendations` have specific owner-write blocks requiring `userId == uid`.
- Admin can read all user records/subcollections.

### Protected user fields

Owner updates may not change `accountStatus` or `adminNote`:

```text
!request.resource.data.diff(resource.data)
  .affectedKeys()
  .hasAny(['accountStatus', 'adminNote'])
```

Admins with `manage_users` may change them.

### Admin records

- `adminUsers/{uid}` owner can read self; admins can list.
- Only `canManageRoles` can create/delete and change roles.
- Owner can update only `name`, `lastLoginAt`, `updatedAt`.
- `isAdmin()` requires `active == true`.

### Support

- User can create only with own `userId`, `status == open`, `priority == medium`, valid category, subject 4–140 chars, description 10–5000 chars.
- User can read own tickets and messages.
- Support roles can read all and update status/priority/assignment.
- User updates are restricted to `status`, `lastMessageAt`, `updatedAt`, `messageCount`, and only reopening from `resolved`/`waiting_for_user`.
- Internal notes are support-only.
- Messages are immutable after create (`update, delete: if false`).

### Content and platform

- `workoutPlans`, `exerciseLibrary`, `nutritionPlans`: admin read, content-manager write.
- `missionSettings`: any signed-in user read, content-manager write.
- `platformSettings`: admin read, super-admin write.
- `adminActivityLogs`: admin read/create, immutable.
- Notifications: owner read and mark-read; admin create/delete.
- Final catch-all: `allow read, write: if false`.

### Enforcement limits

- Rules cannot validate the internal correctness of a generated plan, the honesty of `confidence`, or the medical plausibility of answers.
- Rules do not check `accountStatus` for member reads/writes.
- Rules cannot delete Firebase Auth users or Supabase objects.
- Rules are only effective if the file is deployed; deployment was not verified.

---

## 4. Admin role model

### Roles and permissions

| Role | Permissions in `ROLE_PERMISSIONS` |
|---|---|
| `super_admin` | manage_users, manage_roles, manage_content, manage_support, view_analytics, manage_ai, manage_platform |
| `admin` | manage_users, manage_content, manage_support, view_analytics, manage_ai |
| `fitness_manager` | manage_content, view_analytics |
| `support_manager` | manage_support, view_analytics |
| `analyst` | view_analytics |

### Client permissions versus rules role

Firestore rules authorize almost every admin operation from the `adminUsers/{uid}` document's `role` only (`super_admin`, `admin`, `fitness_manager`, `support_manager`, `analyst`). The client, however, uses `effectivePermissions()` in `src/features/admin/access.ts`, which **prefers the stored `permissions` array when non-empty** and only falls back to `ROLE_PERMISSIONS[role]`.

- `provisionAdmin()` and `updateAdminRole()` keep the two in sync by writing `permissions: ROLE_PERMISSIONS[role]`.
- A manually written `adminUsers` document with a custom `permissions` array could grant UI access (route guards, sidebar) that the Firestore rules do not honour, or hide UI for a role that the rules would allow. The rules remain the real boundary.
- `manage_ai` is part of both `super_admin` and `admin`. `manage_platform` (media, notifications, platform settings) is Super Admin-only in both `ROLE_PERMISSIONS` and `canManagePlatform()`.
- AI monitoring pages read user data through `isAdmin()` collection-group rules, so nothing beyond the generic admin check is enforced for `manage_ai`.

There is no role/permission mismatch in the shipped role mapping; the risk is any out-of-band edit of an admin document.

### Admin provisioning

- Super Admin uses `provisionAdmin()` to create `adminUsers/{uid}` with a role and derived permissions.
- The record is keyed by Firebase UID.
- `active` must be true for rules to treat the user as an admin.
- Admin profile self-updates are limited to name/login timestamp; role changes require `manage_roles`.

### Admin/client trust

- Admin checks are enforced by Firestore rules for data operations.
- Route guards and sidebar filtering are UX only.
- Admin writes such as activity logs are client-originated; a malicious admin could forge log entries. This is expected for an admin audit trail without a trusted server.

---

## 5. Supabase Storage security

### Bucket

- `profile-images`, public read.
- Public read is required for direct `<img>` URLs.
- Object paths are `{uid}/avatar-{timestamp}-{random}.{ext}`.

### Preferred upload path

Browser → Supabase Edge Function → service role → Storage.

The Edge Function:

- Verifies Firebase ID tokens against Google’s public certificates.
- Validates issuer, audience, and subject.
- Enforces file type and 5 MB limit.
- Enforces that delete paths start with the verified UID.
- Generates the upload path server-side.
- Uses the service role only server-side.

### Direct fallback

If the function URL is missing but Supabase is configured, the browser uploads directly. This relies on:

- Supabase configured for Firebase third-party auth.
- Policies in `supabase/storage-policies.sql`.
- The Firebase JWT `sub` claim matching the folder.

The source explicitly warns that the function path is preferred and that the service-role key must never reach the browser.

### Gaps

- Public bucket means anyone with a URL can read a profile image.
- The Edge Function does not check that the user’s Firestore account is active/suspended.
- The function does not verify that the old path belongs to an image currently referenced by the user record; it only checks the UID prefix.
- CORS is `*`; acceptable for a public upload endpoint with token auth, but broad.
- Deployment of the function/bucket/policies was not verified from the repository.

---

## 6. Secrets and environment handling

### Browser-visible configuration

`.env` / `.env.example` contain only:

- Firebase web API key, auth domain, project ID, app ID.
- Supabase project URL and publishable/anon key.
- Supabase upload function URL.
- Optional emulator flag.

Firebase web API keys and Supabase anon keys are public client identifiers by design. They are not service credentials. Security depends on Firebase rules and Supabase policies.

### Server-only secrets

The Edge Function expects:

- `FIREBASE_PROJECT_ID`
- `STORAGE_URL` or `SUPABASE_URL`
- `STORAGE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

These are not present in the repository and must be configured as Supabase function secrets. `STORAGE_SERVICE_ROLE_KEY` must never be exposed to the browser.

### Repository hygiene

- `.env` and `.env.*` are gitignored, except `.env.example`.
- No service-role key, private key, or admin credential was found in source.
- `public/models/workout_recommendation.onnx` and `feature_schema.json` are gitignored but copied at build time.
- `workout-recommendation/.venv` and dataset parquet are gitignored.

---

## 7. Sensitive data

### Current persisted sensitive data

The Mission Detail page persists all mission values via `saveMissionAnswers()` to:

- `users/{uid}/mission_answers/{missionId}` in Firestore.
- `forge:v1:mission-answers:{uid}` in localStorage.

This includes `health-profile` fields such as conditions, injuries, medication, allergies, restrictions, and clearance, and `nutrition-profile` allergy/intolerance text.

### Stale statements in the UI/source

The following contradict the current persistence behavior:

- `src/components/ui/Feedback.tsx` says sensitive answers are “not stored in your browser or sent anywhere.”
- `src/pages/Dashboard/MissionDetailPage.tsx` says sensitive answers “stays in this page memory and is discarded … Nothing is stored in browser storage, Firestore or Supabase.”
- `src/pages/Dashboard/SettingsPage.tsx` says “Medical and mission answers are never persisted” and lists medical data under “Never stored in Firestore.”
- `src/types/index.ts` comments that sensitive data “must not persist client-side.”
- `src/services/profileService.ts` comments that sensitive answers are never written to localStorage.
- `src/data/missions.ts` nutrition copy says allergy answers are not stored.

These are high-priority privacy/documentation defects even though the Firestore rules keep the data owner/admin-only.

### Recommendation snapshot

`RecommendationDocument.missionSnapshot.answers` stores an authoritative subset, including health conditions, injuries, restrictions, and clearance. The generator comment says free-form medical narrative is not duplicated, but the authoritative subset still contains health flags and injury text fields.

### Local storage

Local storage holds profile, mission answers, recommendations, activity, AI summaries, and demo state. It is device/browser-scoped and readable by any script on the origin. There is no encryption at rest in the app.

---

## 8. AI-specific security and integrity

### Recommendation integrity

- Inference and plan generation run in the browser.
- The client writes the plan document and its `confidence`, `modelVersion`, `safety`, and `schedule`.
- Firestore rules allow the owner to write their own recommendation.
- A modified client could forge a plan, bypass generator checks, or claim arbitrary confidence. `validatePlan()` is not a security boundary.
- The rule comment explicitly says to switch writes to `if false` when a backend inference API is added.

### Form model integrity

- Model files are served from the app origin.
- CDN dependencies are version-pinned but not subresource-integrity pinned.
- A compromised CDN/origin could alter inference code or models.
- The UI correctly limits claims: held-out accuracy is modest, and the model is a secondary signal.

### Medical safety

- Injury free text is reduced to a category; high-risk conditions/clearance trigger conservative programming and a professional-review warning.
- The plan is explicitly not medical clearance.
- No clinician review workflow exists.

---

## 9. Security gaps and recommended controls

| ID | Gap | Evidence | Impact | Severity | Recommended control |
|---|---|---|---|---|---|
| S1 | No server-side recommendation validation | `createRecommendation` and `persistRecommendation` run client-side; rules allow owner create/update | Forged plans, arbitrary safety/confidence | High | Move generation/validation to trusted backend; make recommendation writes server-only |
| S2 | Suspended users were not blocked at data layer | **Resolved in Phase 1 repo rules:** active-owner checks plus root-read/support exception; see `PHASE_1_IMPLEMENTATION_REPORT.md` | Residual risk only if rules are not deployed | High until deployed | Deploy hardened rules after staging approval; keep recovery/support path |
| S3 | Sensitive mission answers persisted with contradictory privacy copy | `saveMissionAnswers`; stale copy in Feedback, MissionDetail, Settings, types | Privacy/compliance misrepresentation | High | Decide data policy; update copy and consent; encrypt/restrict or stop persisting free text |
| S4 | No server-side mission/health validation | Mission form validates in browser only | Malformed or abusive records; safety checks depend on honest client | Medium | Validate/normalize server-side before plan generation |
| S5 | Client can write `confidence`, `modelVersion`, `safety` | Plan document is client-written | Misleading admin/UI data | Medium | Server-side plan creation and immutable model fields |
| S6 | No email verification/MFA gate | Auth flow never checks `emailVerified` | Account takeover risk for unverified emails; reduced assurance | Medium | Require verification for sensitive actions; optional MFA |
| S7 | Firestore rules deployment unverified | Rules file exists; no emulator tests/deploy proof | Live project may differ from source | Medium | Add rules unit tests and deployment verification |
| S8 | Profile image bucket is public | `storage-policies.sql` public bucket | Anyone with URL can view image | Low/Medium | Accept or use signed URLs/private bucket |
| S9 | CDN dependencies lack SRI | `modelClient.ts`, `inference.ts` dynamic imports | Supply-chain risk | Medium | Self-host or pin with integrity checks |
| S10 | localStorage stores sensitive answers | `localRecommendationRepository` | Device compromise/exposure | Medium | Avoid storing free-text medical data locally; use secure backend |
| S11 | Admin activity logs are client-written | `logAdminActivity` | Admin can forge audit entries | Low/Medium | Write logs via trusted backend |
| S12 | No account deletion path | Settings copy; no Admin SDK | Privacy deletion requests cannot be fulfilled in-app | Medium | Server-side deletion workflow + storage cleanup |
| S13 | No rate limiting on client-side AI/admin operations | Direct Firestore writes | Abuse/cost, but bounded by Firebase quotas | Low/Medium | App Check, rate limits, server mediation |
| S14 | Support ticket user fields are client-supplied | `createTicket` accepts `userName`/`userEmail` | Spoofed display name/email in admin queue | Low | Derive identity server-side from token/user doc |
| S15 | No CSP/security headers in repo | No hosting headers config | XSS impact amplification | Low/Medium | Add CSP, HSTS, frame-ancestors at host/CDN |

---

## 10. Explicit non-claims

- The existence of `firestore.rules` does not prove the rules are deployed to `forge-11cbf`.
- The existence of the Edge Function source does not prove it is deployed or that its secrets are configured.
- No penetration test, multi-user isolation test, rules-emulator test, or production security review was executed for this audit.
- No secret values were read, printed, or documented.
