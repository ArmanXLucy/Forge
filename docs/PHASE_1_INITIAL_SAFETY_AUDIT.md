# Phase 1 — Initial Safety Audit

**Project:** Forge Athletic (`F:\Fitness Coach`)  
**Audit date:** 2026-11-22  
**Branch:** `main`  
**Latest commit:** `c246ad7 new workout section added`  
**Working tree at audit start:** only untracked `docs/` (architecture documentation from the prior read-only audit). No tracked source changes.

This audit was completed before any Phase 1 code change.

---

## 1. Scope and method

Read-only inspection of:

- Git state and repository structure
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`
- Firebase initialization and Auth service/context
- Profile/activity/recommendation stores
- Firestore member and admin repositories
- Admin access checks, role helpers and navigation
- Mission definitions, mission persistence, privacy copy
- Suspension handling
- Recommendation generation and persistence
- Supabase profile-image Edge Function and client storage service
- Test configuration and existing tests
- Prior architecture documentation

No model artifacts, `ml/` files, production configuration, or user data were touched.

---

## 2. Existing security controls

| Control | Status | Evidence |
|---|---|---|
| Firebase Authentication | Implemented | `src/lib/firebase.ts`, `src/features/auth/AuthContext.tsx` |
| Email/password, Google, reset | Implemented | `src/services/authService.ts` |
| Demo session isolated from Firebase | Implemented | localStorage marker + `isDemo` flag; admin denies demo |
| Deny-by-default Firestore rule | Implemented | final `match /{document=**} { allow read, write: if false; }` |
| Owner-scoped member documents | Implemented | `isOwner(uid)` checks on `users/{uid}` and subcollections |
| Admin role checks | Implemented | `isAdmin()`, `hasRole()`, role helper functions |
| Protected `accountStatus` / `adminNote` on owner update | Implemented | `diff(...).affectedKeys().hasAny(...)` |
| Admin-only collection-group reads | Implemented | `match /{path=**}/... { allow read: if isAdmin() }` |
| Support-ticket ownership isolation | Implemented | `resource.data.userId == request.auth.uid` |
| Internal notes support-only | Implemented | `allow read: if canSupport()` |
| Unknown paths denied | Implemented | catch-all deny |
| Profile-image token verification | Implemented in source | Supabase Edge Function verifies Firebase JWT |
| Profile-image type/size limits | Implemented in source | JPEG/PNG/WebP, 5 MB |
| Service-role key server-only | Preserved | Edge Function env; client uses anon key |

---

## 3. Existing Firestore rule behavior

### 3.1 Helpers

- `signedIn()` — `request.auth != null`
- `isOwner(uid)` — signed in and UID matches
- `isAdmin()` — `adminUsers/{uid}` exists and `active == true`
- `hasRole(roles)` — active admin with role in list
- `canManageUsers()` — super_admin, admin
- `canManageRoles()` — super_admin
- `canManageContent()` — super_admin, admin, fitness_manager
- `canSupport()` — super_admin, admin, support_manager
- `canViewAnalytics()` — super_admin, admin, fitness_manager, support_manager, analyst
- `canManagePlatform()` — super_admin

### 3.2 Member data

`users/{uid}`:

- get/list: owner or any active admin
- create: owner, with matching `uid`
- update: owner may not change `accountStatus` or `adminNote`; admins with `manage_users` may
- delete: owner or super_admin

Generic subcollections `users/{uid}/{collection}/{docId}`:

- read: owner or any active admin
- create/update: owner, with `userId == uid` when the field exists
- delete: owner or super_admin

Specific overrides:

- `mission_answers`: owner create/update requires `userId == uid`; read owner/admin; delete owner/super_admin
- `workout_recommendations`: owner create/update requires `userId == uid`; read owner/admin; delete owner/super_admin

### 3.3 Admin/support/content

- `adminUsers`: self/admin read, admin list, super_admin create/delete/role changes; self-update only `name`, `lastLoginAt`, `updatedAt`
- `supportTickets`: owner or support read, owner list, owner create with strict field checks, owner limited updates, support full updates, super_admin delete
- `supportTickets/messages`: owner of parent ticket or support read; immutable
- `supportTickets/internal_notes`: support read/create; super_admin update/delete
- `notifications`: owner or admin get/list, admin create, owner only `read` update
- `adminActivityLogs`: admin read/create, immutable
- `workoutPlans`, `exerciseLibrary`, `nutritionPlans`: any active admin read, content roles write
- `missionSettings`: any signed-in user read, content roles write
- `platformSettings`: any active admin read, super_admin write

### 3.4 Observations

1. **Suspension is absent from every rule.** `accountStatus` is only used in the UI.
2. **Root user doc read remains necessary for suspension messaging**; a blanket suspension block would make the account status unreadable and break the existing suspension screen.
3. **Generic subcollection owner reads are currently unrestricted by account status.**
4. **All active admin roles can read content and platform settings**, even when their route permissions would not show those pages. This is broader than the role model implies.
5. **A member can currently write their own recommendation document** and choose its schedule, safety, confidence, and model fields. This is a known Phase 1 deferral, not fixed now.
6. Rules cannot validate medical plausibility or plan correctness. Client-side validation is not a security boundary.

---

## 4. Authentication flow

1. App loads `AuthProvider`.
2. `authService.subscribe()` attaches `onAuthStateChanged`, or restores a development demo session.
3. On user change, `AuthProvider` hydrates:
   - `useProfileStore` with UID, cloud flag, email, display name, photo URL
   - `useActivityStore` with UID and cloud flag
4. `useProfileStore.hydrate()`:
   - loads local profile/progress/answers
   - sets `accountStatus: 'active'` initially
   - if cloud enabled, `ensureUserAccount()`, `getUserRecord()`, `getMissionProgress()`, `fetchMissionAnswers()` in a single `Promise.all`
   - writes migrated local profile/progress if cloud is empty
   - sets `accountStatus` from the user document
5. Route guards allow `/dashboard/*` when a user exists; `DashboardLayout` blocks suspended users after hydration.
6. Admin access is separately verified by `useAdminAccess()` reading `adminUsers/{uid}` and checking `active`.

### Demo mode

- Marker key: `forge:demo-session:v1`
- UID: `demo-athlete`
- Demo only in development (`import.meta.env.DEV`)
- Demo has no Firebase ID token, cannot pass Firestore rules, and is denied admin access.
- Demo data uses local storage only.

---

## 5. Existing admin permission checks

- `ROLE_PERMISSIONS` in `src/types/admin.ts` maps roles to permissions.
- `useAdminAccessState()` denies:
  - anonymous users
  - demo users
  - users without `adminUsers/{uid}`
  - inactive admin records
- `RequireAdmin` gates the admin workspace.
- `RequireAdminPermission` gates individual pages.
- `adminNav` hides unauthorized links.
- Firestore rules enforce data operations by role; route guards are convenience only.

### Observed discrepancy

`admin` has no `manage_ai` permission in `ROLE_PERMISSIONS`, while `fitness_manager`, `support_manager`, and `analyst` also lack it. Only `super_admin` can reach AI Monitoring through the UI. This is existing behavior, not changed in Phase 1.

---

## 6. Existing suspension behavior

- Admin UI can set `users/{uid}.accountStatus` to `suspended` via `updateUserAccount()`.
- `useProfileStore` hydrates the value from Firestore.
- `DashboardLayout` renders a suspension screen and hides member content.
- **No Firestore rule checks `accountStatus`.**
- A suspended user with a valid Firebase token can use the SDK directly to read/write member subcollections, create support tickets, etc.
- The suspension screen currently tells the user to open support “after access is restored,” but the Help Desk UI is blocked. Support ticket creation via rules remains possible.

**Risk:** suspension is advisory, not enforced.

---

## 7. Sensitive data persistence locations

### Mission answers

`saveMissionAnswers(missionId, values)` writes:

1. `localStorage["forge:v1:mission-answers:{uid}"]` — complete answer map
2. If cloud enabled, `users/{uid}/mission_answers/{missionId}` with `{ missionId, userId, values, updatedAt, schemaVersion }`

Call chain:

- `MissionDetailPage.saveForLater()` and `persistAndFinish()` → `useProfileStore.saveMissionAnswers()` → local repository + `persistMissionAnswers()`

All fields are persisted, including:

- **Health Profile:** `conditions`, `injuries`, `medication`, `allergies`, `clearance`, `restrictions`, `emergencyConsent`
- **Nutrition Profile:** `diet`, `foodAllergies`, `intolerances`, `habits`, `water`, `cooking`, `budget`, `supplements`
- **Body Metrics:** includes weight, body fat, lean mass, resting heart rate, circumferences, blood pressure, optional sex
- **Training History:** experience, sports, routine, preferences, lift benchmarks, equipment
- **Lifestyle, Goals, Mindset:** sleep, stress, occupation, motivation, obstacles, coaching preferences

### Recommendation documents

`workout_recommendations/{recommendationId}` stores:

- full schedule, plan metadata, safety summary
- `missionSnapshot.answers` — authoritative subset only:
  - body: weight, gender
  - health: conditions, injuries, restrictions, clearance
  - training: experience, equipment
  - lifestyle: sleepHours, stress, dailyActivity
  - goal: primaryGoal, secondaryGoals, timeline
  - mindset: weeklyTime, coachingStyle, confidence
- `confidence`, `classProbabilities`, `modelVersion`, `inferenceMs`
- no medication, allergies, diet, or nutrition free text in the snapshot
- health injury/restriction free text **is** included

The same plans are also cached in `localStorage["forge:v1:recommendations:{uid}"]`.

### Profile images

- Supabase bucket `profile-images`, public read
- Firestore stores `avatarUrl` and `avatarPath`
- Mission progress photos are preview-only; never uploaded

### Not stored

- Mission photo files
- Camera frames/video (AI Coach session summaries only)
- Laboratory reports/documents (no upload feature)

---

## 8. Misleading privacy statements found

| Location | Current claim | Reality |
|---|---|---|
| `src/pages/Dashboard/MissionDetailPage.tsx` | Sensitive text “stays in this page memory and is discarded … Nothing is stored in browser storage, Firestore or Supabase.” | All mission answers are persisted locally and in Firestore |
| `src/pages/Dashboard/SettingsPage.tsx` (“Never stored in Firestore”) | Medical conditions, medications, allergies; mission answers | Mission answers, including these fields, are stored in Firestore |
| `src/pages/Dashboard/SettingsPage.tsx` (“Deliberate boundaries”) | “Medical and mission answers are never persisted.” | Persisted |
| `src/data/missions.ts` Health Profile description | “Nothing you type is stored in your browser or sent anywhere.” | Persisted |
| `src/data/missions.ts` Nutrition Profile description | “Allergy and intolerance answers are not stored in this frontend build.” | Persisted |
| `src/types/index.ts` `MissionDefinition.sensitive` comment | “must not persist client-side” | Persisted |
| `src/services/profileService.ts` module comment | Sensitive answers “never written to localStorage … discarded” | Persisted in `forge:v1:mission-answers:*` |
| `src/components/ui/Feedback.tsx` | Says answers are not stored / sent anywhere | Persisted; component currently unused |

These are documentation/UI defects, not evidence that encryption or access control exists.

---

## 9. Recommendation write behavior

- Generation: browser ONNX + TypeScript generator + validator.
- Persistence: `persistRecommendation(uid, plan)` writes `users/{uid}/workout_recommendations/{id}` with `merge: true`.
- Deactivation: `deactivateRecommendations()` writes `isActive: false` to other plans.
- Outdated updates: `syncOutdated()` rewrites active plan metadata.
- Reads: member hydration and Admin collection-group rule (no current admin UI consumer).
- Client controls all fields, including `confidence`, `modelVersion`, `safety`, `schedule`, `isActive`.

**Phase 1 action:** document only. Do not deny client writes until a trusted replacement exists, otherwise plan generation breaks.

---

## 10. Supabase profile-image review

Source: `supabase/functions/profile-image/index.ts`

### Present controls

- Requires `Authorization: Bearer <Firebase ID token>`
- Verifies JWT signature with Google X.509 certificates
- Validates issuer `https://securetoken.google.com/{projectId}`
- Validates audience `{projectId}`
- Uses `sub` as UID
- Accepts only JPEG/PNG/WebP
- Rejects empty files and files > 5 MB
- Generates server-side object path under `{uid}/`
- Delete path must start with `{uid}/`
- Upload uses `upsert: false`
- Service-role key remains server-side
- `--no-verify-jwt` is intentional because Firebase tokens are verified manually

### Gaps

- CORS `Access-Control-Allow-Origin: *`
- No `accountStatus` check; a suspended user with a fresh token can still upload/delete
- No verification that `oldPath` is currently the user’s avatar (only prefix check)
- Public bucket allows anyone with the URL to read
- Deployment and secrets configuration cannot be verified from the repository
- Direct Supabase fallback depends on external third-party-auth/storage policies not verifiable locally

No change is required for this phase unless a small, compatible hardening is clearly safe. The suspension gap should be documented as a deployment/back-end limitation.

---

## 11. Existing tests and verification setup

- `npm test` → `vitest run`
- Existing tests:
  - `src/features/workout-recommendation/__tests__/generator.test.ts`
  - `src/features/workout-recommendation/__tests__/modelInput.test.ts`
- No `vitest.config.*`; Vite config is used.
- `@firebase/rules-unit-testing@4.0.1` is installed but unused.
- `firebase-tools` is not installed locally; Firebase CLI is not on PATH.
- `firebase.json` configures Firestore emulator on port 8080 and Auth on 9099.
- No emulator test scripts, seed fixtures, or rules tests.
- No storage tests, no Edge Function tests.

---

## 12. Discrepancies with architecture documentation

The prior `docs/architecture/` documents describe the system accurately:

- No application backend/REST API
- Firebase client SDK + Firestore rules as the data boundary
- Sensitive mission answers are persisted and privacy copy is stale
- Recommendation plans are client-writable
- Suspension is UI-only
- Admin content catalogs are not consumed by member pages
- No rules/storage tests

No contradiction requiring a documentation correction was found in those docs during this inspection. Historical root-level audit files remain stale and are out of scope.

---

## 13. Risks requiring Phase 1 changes

| Risk | Required action | Risk of change |
|---|---|---|
| Suspended users can still read/write member subcollections | Add rule-level active-owner checks; keep self user-doc read and support access | Medium: could break hydration unless payload loading is adjusted |
| Members can forge `accountStatus`/`adminNote` on create | Constrain owner create fields | Low |
| Members can add administrative fields during update | Protect role/permission-like fields in addition to existing fields | Low |
| Misleading privacy claims | Correct copy and comments to match persistence | Low, UI text only |
| No automated rules tests | Add emulator tests with roles/suspension/support/recommendations | Test-only |
| All active admins can read content/platform settings | Consider tightening to intended permissions without breaking admin pages | Medium; defer if unsafe |
| Supabase function does not check suspension | Document deployment limitation; do not guess without trusted account lookup | Deferred |
| Client-authoritative recommendation plans | Document migration plan; do not deny writes yet | Deferred |

---

## 14. Risks deferred to later phases

- Server-side recommendation generation, inference, validation, and plan writes
- Suspended-account enforcement in Supabase Edge Function / Firebase Auth token revocation
- Account deletion and full data erasure
- Sensitive-data minimization/migration and encryption
- Admin content/member integration
- Firestore rules deployment
- Production rules verification and multi-user staging tests
- Role model cleanup (`admin` vs `manage_ai`)
- Account email verification/MFA
- CDN integrity/self-hosting

---

## 15. Safety conclusion

The project can be hardened in Phase 1 without restructuring:

1. Add an active-owner check for member subcollections, while allowing suspended users to read their own user document and support/notification records necessary to understand or appeal suspension.
2. Adjust profile hydration so a suspended account displays its status instead of failing the whole cloud load.
3. Protect administrator-controlled fields on user creation/update.
4. Correct privacy statements to match actual persistence.
5. Add emulator-only rules tests.
6. Document recommendation and profile-image security gaps without changing those workflows.

No destructive migration, model change, UI redesign, or production deployment is needed.

<!-- phase1-audit-complete -->
