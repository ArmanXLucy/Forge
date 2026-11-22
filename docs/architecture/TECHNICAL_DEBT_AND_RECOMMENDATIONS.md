# Forge Athletic — Technical Debt and Recommendations

> **Phase 1 update (2026-11-22):** D3 (suspension) and D6 (rules tests) were addressed in the repository. Rules deployment is still pending approval. See `docs/PHASE_1_IMPLEMENTATION_REPORT.md`.

This document records verified debt and missing integrations. It does not propose changing product scope; it prioritizes what would make the current system safer, more coherent, and easier to maintain.

---

## 1. Priority summary

| Priority | Theme | Why it matters |
|---|---|---|
| P0 | Server-side trust boundary for recommendation plans | The client currently writes its own AI plan, safety summary, confidence, and model version |
| P0 | Sensitive mission data policy and privacy copy | Medical/health text is persisted while multiple screens say it is not |
| P0 | Suspended-account enforcement | Resolved in Phase 1 repo rules; production deployment pending |
| P1 | Connect admin content to member experiences | Admin workout/exercise/nutrition CRUD currently does not drive member pages |
| P1 | Fix AI workout source labeling | AI workouts are written as `source: 'plan'` |
| P1 | Verification/test coverage for rules and storage | No emulator/security tests exist |
| P1 | Recommendation model visibility in admin | Form models are monitored; recommendation model is not |
| P2 | Duplicate/static data and stale labels | Confusing UI and maintenance risk |
| P2 | Data-fetching and scalability | Full-collection reads, client pagination, N+1 support messages |
| P2 | Dependency/runtime hygiene | Two ORT versions, unused modules, CDN reliance |
| P3 | Code and schema cleanup | Dead exports and unused static datasets |

---

## 2. Findings

### D1 — Recommendation plans are client-authoritative

**Location:** `src/features/workout-recommendation/lib/recommendationService.ts`, `src/store/useRecommendationStore.ts`, `src/features/workout-recommendation/data/recommendationRepository.ts`, `firestore.rules` (`workout_recommendations`).

**Evidence:** `createRecommendation()` runs ONNX inference and `generateWorkoutPlan()` in the browser. `useRecommendationStore.generate()` calls `persistRecommendation()` directly. The rules allow `isOwner(uid)` create/update on the user’s recommendation documents, and the comment says to switch to `if false` when a backend inference API is added.

**Impact:** A modified client can write any schedule, remove safety notes, bypass `validatePlan()`, or claim arbitrary confidence/model version. The plan is not trustworthy evidence of what the model produced.

**Severity:** High.

**Suggested solution:** Move readiness validation, inference, generation, and plan validation to a trusted backend. Store plans with the Admin SDK or a server endpoint. Revoke client create/update on `workout_recommendations` (`if false`) and expose read-only history to members.

---

### D2 — Sensitive mission data is persisted while UI says it is not

**Location:** `src/pages/Dashboard/MissionDetailPage.tsx`, `src/pages/Dashboard/SettingsPage.tsx`, `src/components/ui/Feedback.tsx`, `src/data/missions.ts`, `src/types/index.ts`, `src/services/profileService.ts`, `src/store/useProfileStore.ts`, `src/features/workout-recommendation/data/recommendationRepository.ts`.

**Evidence:** `saveMissionAnswers()` runs on save/complete and writes every normalized field to localStorage and `users/{uid}/mission_answers/{missionId}`. Health Profile includes conditions, injuries, medication, allergies, restrictions, and clearance. Nutrition Profile includes allergy/intolerance text.

Contradictory rendered copy:

- Mission Detail says sensitive answers “stays in this page memory and is discarded … Nothing is stored in browser storage, Firestore or Supabase.”
- Settings lists “Medical conditions, medications and allergies” and “Mission form answers” under “Never stored in Firestore.”
- Settings says “Medical and mission answers are never persisted.”
- `data/missions.ts` says allergy answers are not stored.
- `Feedback.tsx` says answers are not stored anywhere.

**Impact:** Privacy/consent misrepresentation; medical data stored in localStorage and Firestore without accurate disclosure; regulatory and trust risk.

**Severity:** High.

**Suggested solution:** Choose one policy. If persistence is required for personalization, update all copy, consent, retention, and data-deletion behavior. Prefer storing only the minimum derived safety flags needed by the model, or move sensitive answers to a restricted backend with encryption and explicit retention. Remove stale comments/exports (`Feedback.tsx` is unused).

---

### D3 — Suspended accounts were blocked only in the UI (RESOLVED IN PHASE 1 REPO)

**Location:** `src/layouts/DashboardLayout.tsx`, `firestore.rules`.

**Evidence:** `DashboardLayout` renders an “Account suspended” screen when `accountStatus === 'suspended'`. Firestore rules never test `accountStatus` for user reads/writes. A suspended user with a valid Firebase token can call Firestore directly or use a modified client.

**Impact:** Suspension is not a true access control; a suspended member can continue reading/writing their data and using the app through API calls.

**Severity:** High (until hardened rules are deployed).

**Phase 1 resolution:** `firestore.rules` now uses active-owner checks for member subcollections and root updates, while allowing suspended users to read their root document and use support. 34 emulator tests cover this. Deployment remains pending.

**Remaining:** deploy the rules after staging approval; consider revoking refresh tokens server-side on suspension.

---

### D4 — Admin content collections are disconnected from member experiences

**Location:** `src/pages/Admin/WorkoutsPage.tsx`, `ExercisesPage.tsx`, `NutritionPage.tsx`, `src/components/admin/EntityManager.tsx`, `src/pages/Dashboard/WorkoutsPage.tsx`, `src/features/workout-recommendation/data/exerciseLibrary.ts`, `src/data/dashboard.ts`, `src/pages/Dashboard/NutritionPage.tsx`.

**Evidence:** Admin CRUD writes `workoutPlans`, `exerciseLibrary`, `nutritionPlans`. Member workout pages use static `src/data/dashboard.ts` / recommendation catalogs; the plan generator uses static `exerciseLibrary.ts`; Nutrition uses static `NUTRITION_TARGETS` and `DAILY_MEALS`. No member repository reads those admin collections.

**Impact:** Administrators can edit content that never reaches members. This creates a false impression of content management and blocks operational publishing.

**Severity:** High (product integration gap).

**Suggested solution:** Either connect member pages to the Firestore catalogs (with status/published filters and caching), or label the admin managers as staging/not connected and remove the expectation. For the AI generator, decide whether Firestore exercises replace or supplement the static library, and version the catalog.

---

### D5 — AI plan workouts are mislabeled as `source: 'plan'`

**Location:** `src/pages/Dashboard/WorkoutsPage.tsx` (`handleSave`), `src/types/activity.ts` (`WorkoutSource`), `src/services/cloud/firestoreRepository.ts` (`saveWorkout`).

**Evidence:** `handleSave` always writes `source: 'plan'`, even when `activeWorkout.id.startsWith('ai:')`. `saveWorkout` preserves `'ai'` only if the incoming document already has it. Adherence works because it keys on `workoutId`, but source analytics do not.

**Impact:** AI-vs-sample workout reporting is wrong; `WorkoutSource.ai` is effectively unused for new records. Admin/analytics cannot distinguish AI plan sessions.

**Severity:** Medium.

**Suggested solution:** Set `source: activeWorkout.id.startsWith('ai:') ? 'ai' : 'plan'` in `handleSave`. Add a test for the saved record.

---

### D6 — No rules, storage, or end-to-end backend tests (RULES TESTS ADDED IN PHASE 1)

**Location:** `package.json`, `src/features/workout-recommendation/__tests__/*`, `@firebase/rules-unit-testing` dependency.

**Evidence:** Only two Vitest files exist, both recommendation-domain tests. `@firebase/rules-unit-testing` is installed but no test file uses it. No emulator scripts, no test UID fixtures, no Supabase function tests. Historical reports explicitly mark Firestore end-to-end and multi-user security tests as NOT EXECUTED.

**Impact:** Ownership rules, admin roles, support isolation, suspension behavior, and storage policies are unverified.

**Suggested solution:** Add a `firebase emulators:exec` test suite covering owner/admin/anonymous/suspended reads/writes, support ticket isolation, content permissions, notification read rules, and recommendation write restrictions. Add Edge Function tests for token/path/MIME/size validation. Add a real-account smoke test in a staging project.

---

### D7 — Recommendation model is absent from admin monitoring

**Location:** `src/pages/Admin/AIMonitoringPage.tsx`, `AICoachMonitoringPage.tsx`, `useModelMetadata.ts`, `useAdminSnapshot.ts`.

**Evidence:** Admin AI pages load form-classifier metadata and AI Coach sessions only. `getAdminSnapshot()` does not read `workout_recommendations` or recommendation metrics. No admin page displays recommendation confidence, category distribution, generation failures, or outdated-plan counts.

**Impact:** Operators cannot observe the newer AI feature that drives the primary workout experience.

**Severity:** Medium.

**Suggested solution:** Add a recommendation monitoring section: model schema/version, active plan count, category distribution, confidence distribution, outdated plans, generation error telemetry. Collection-group reads for `workout_recommendations` are already permitted by rules.

---

### D8 — Stale and duplicate sample content across member surfaces

**Location:** `src/data/dashboard.ts`, `src/pages/Dashboard/OverviewPage.tsx`, `src/pages/Dashboard/WorkoutsPage.tsx`, `src/pages/Dashboard/NutritionPage.tsx`, `src/components/dashboard/WorkoutPlayer.tsx`, `src/components/layout/PublicFooter.tsx`.

**Evidence:** Overview chooses the planned workout from static `WORKOUTS` even when an AI plan exists. Workouts uses static sample content for non-AI users. Nutrition targets/example meals are static. WorkoutPlayer footer says “Loads and exercises are sample content.” Public footer says “Demo project — sample content & metrics.”

**Impact:** AI users can see a static planned workout on Overview that disagrees with their AI plan. Sample data can be mistaken for personalized guidance. The product presents mixed maturity signals.

**Severity:** Medium.

**Suggested solution:** Make Overview AI-aware (show the active AI plan’s next day). Clearly label every remaining sample block. Remove “demo project” copy if this is intended as production. Replace static nutrition targets with a documented, personalized or explicitly labeled reference.

---

### D9 — Admin platform settings are stored but not applied

**Location:** `src/pages/Admin/SettingsPage.tsx`, `src/services/cloud/adminRepository.ts` (`getPlatformSettings` / `savePlatformSettings`).

**Evidence:** The settings page itself notes: “This release stores the message but does not inject it into the member app.” No member code reads `platformSettings`.

**Impact:** Operators can believe they have published a maintenance/support message that members never see.

**Severity:** Medium.

**Suggested solution:** Read `platformSettings/main` in a global member provider and render the maintenance message/banner; otherwise label the setting as draft-only.

---

### D10 — Admin notifications copy says “sample” while records are real

**Location:** `src/pages/Admin/NotificationsPage.tsx`.

**Evidence:** The unread stat is labeled `Unread in recent sample`, while it is computed from the latest 100 Firestore notification records.

**Impact:** Misleading operations label; minor trust/quality issue.

**Severity:** Low.

**Suggested solution:** Change the label to “Unread in latest 100 records.”

---

### D11 — No account deletion / full data erasure

**Location:** `src/pages/Dashboard/SettingsPage.tsx`, `src/services/cloud/*`, `supabase/functions/profile-image/index.ts`.

**Evidence:** Settings says account deletion needs a trusted server operation. There is no delete-user function, no Firestore full-account purge, and no Supabase folder purge on account deletion. `resetAllData()` clears only local cache. `clearActivity()` deletes activity but not profile/missions/answers/plans/photo.

**Impact:** GDPR/privacy deletion requests cannot be fulfilled in-app; orphaned storage objects and user data can remain.

**Severity:** Medium (High if launched in a regulated market).

**Suggested solution:** Implement a server-side deletion workflow using Firebase Admin + Storage service role: delete Auth user, user document and all subcollections, support tickets/notifications, and profile-image objects. Add an audit record with legal retention rules.

---

### D12 — `lastLoginAt` is never recorded

**Location:** `src/services/cloud/adminRepository.ts` (`updateAdminProfile`), `src/pages/Admin/AdminLoginPage.tsx`, `src/pages/Admin/ProfilePage.tsx`.

**Evidence:** `updateAdminProfile` supports `lastLoginAt`, but the only caller (`ProfilePage.save`) passes only `{ name }`. Admin login does not update it. The profile page will show “Not recorded” indefinitely.

**Impact:** Admin login telemetry is absent; “last login” is misleading.

**Severity:** Low.

**Suggested solution:** On successful admin access, call `updateAdminProfile(uid, { name, lastLoginAt: true })` inside `useAdminAccess` (once), or rely on a trusted backend/audit log.

---

### D13 — `Feedback.tsx` is unused and contains obsolete privacy claims

**Location:** `src/components/ui/Feedback.tsx`.

**Evidence:** `DemoNotice` and `MissionMeta` are not imported anywhere. `DemoNotice` claims sensitive answers are not stored.

**Impact:** Dead code retains dangerous copy that a future developer may reuse; build surface/confusion.

**Severity:** Low/Medium.

**Suggested solution:** Delete the unused module or update it to match the chosen data policy.

---

### D14 — Unused static dashboard datasets

**Location:** `src/data/dashboard.ts`.

**Evidence:** `WEEKLY_ACTIVITY`, `WEIGHT_HISTORY`, and `MEASUREMENTS` are exported but have no consumer outside their own module (verified by repository-wide search). Only `WORKOUTS`, `MOTIVATION`, `DAILY_MEALS`, and `NUTRITION_TARGETS` are imported by pages. This supersedes an earlier observation about duplicate mission options/keys: a re-check of `src/data/missions.ts` found a single `home-basic` equipment option and a single `type` key on `previousAttempts`.

**Impact:** Dead sample data makes it harder to tell which static content is still part of the product and increases the chance that a future agent edits unused data.

**Severity:** Low.

**Suggested solution:** Delete the unused exports or move all demo fixtures behind a single clearly named module. Add a mission-definition validation test (unique field IDs/options) to prevent the previously reported duplication from recurring.

---

### D15 — `MarkRecommendationsOutdated` and other cleanup helpers are unused

**Location:** `src/features/workout-recommendation/data/recommendationRepository.ts`, `src/services/cloud/firestoreRepository.ts`, `src/features/ai-coach/lib/modelClient.ts`, `src/components/layout/RouteGuards.tsx`.

**Evidence:** `markRecommendationsOutdated`, `deleteAllMissionAnswers`, `deleteAllRecommendations`, `deleteAllMissionProgress`, `resetAIClient`, and `RequireOnboarding` have no call sites.

**Impact:** Dead API surface and unclear ownership of cleanup flows. `RequireOnboarding` duplicates the DashboardLayout profile redirect.

**Severity:** Low.

**Suggested solution:** Remove or wire into explicit reset/delete flows. If retained for future backend migration, document them as reserved.

---

### D16 — React Query is configured but not used

**Location:** `src/main.tsx`, `package.json`, member/admin pages.

**Evidence:** A `QueryClientProvider` is installed with defaults, but no `useQuery`/`useMutation` calls exist. Pages use `useEffect` + local state or Zustand.

**Impact:** Unnecessary dependency/config and no shared caching/deduplication. Admin pages refetch full collections on every mount; member pages do their own hydration.

**Severity:** Low/Medium.

**Suggested solution:** Either adopt React Query for Firestore reads with query keys/invalidations, or remove the provider/dependency. Do not run both patterns indefinitely without a convention.

---

### D17 — Admin collection reads are unbounded and client-paginated

**Location:** `src/services/cloud/adminRepository.ts` (`listAllUsers`, `getAdminSnapshot`, `listContent`, `getAllSupportMessages`), `src/pages/Admin/UserManagementPage.tsx`.

**Evidence:** `listAllUsers()` reads the entire `users` collection. User management paginates only in memory (`PAGE_SIZE = 12`). `getAdminSnapshot` reads all collection-group workouts/missions/AI sessions and all tickets/messages. `getAllSupportMessages` performs one query per ticket.

**Impact:** Cost and latency grow with users/tickets. Admin overview can become slow and expensive.

**Severity:** Medium (scalability).

**Suggested solution:** Add server-side pagination/queries (`limit`, `startAfter`), aggregate counters or materialized summary docs, and avoid per-ticket message fan-out on dashboard load. Create composite indexes where needed.

---

### D18 — Two ONNX Runtime versions and CDN reliance

**Location:** `src/features/ai-coach/lib/modelClient.ts` (ORT 1.19.2), `src/features/workout-recommendation/lib/inference.ts` (ORT 1.31.1), `src/lib/supabase.ts`.

**Evidence:** Both feature areas dynamically import different ORT versions from jsDelivr. The app also loads MediaPipe from jsDelivr and a pose task from Google Cloud Storage. No local fallback or SRI.

**Impact:** Duplicate runtime downloads, version drift, offline failure, supply-chain risk, and possible CSP complexity.

**Severity:** Medium.

**Suggested solution:** Standardize on one ORT version and self-host the WASM/glue with the model assets (or use integrity-pinned CDN URLs). Cache model assets with versioned filenames. Document offline behavior.

---

### D19 — Static nutrition targets presented alongside real logs

**Location:** `src/pages/Dashboard/NutritionPage.tsx`, `src/data/dashboard.ts`.

**Evidence:** Logged meals are real, but targets are fixed at 2400 kcal / 168P / 260C / 72F / 3L. The page says targets are sample content. No calculation uses age/weight/goal.

**Impact:** Members may interpret generic numbers as personalized guidance.

**Suggested solution:** Either calculate targets from profile/goal with a documented formula and safety caveats, or present them as a generic reference only and avoid percentage/progress framing that implies personalization.

---

### D20 — Admin media management is read-only

**Location:** `src/pages/Admin/MediaPage.tsx`.

**Evidence:** It lists users/avatar URLs and storage health. There is no upload, replace, delete, or orphan cleanup action.

**Impact:** Admin cannot remediate broken/abusive images or clean orphaned objects.

**Severity:** Low/Medium.

**Suggested solution:** Add a trusted server-side moderation action (delete object + clear Firestore metadata) with audit logging.

---

### D21 — Support attachments are absent

**Location:** `src/pages/Dashboard/HelpDesk/HelpDeskPage.tsx`, support types.

**Evidence:** UI explicitly says attachments are not enabled. `SupportMessage` has no attachment field.

**Impact:** Users cannot provide screenshots/logs; support efficiency is reduced. Not a bug, but a visible product gap.

**Severity:** Low (product).

**Suggested solution:** If needed, add a private support-attachments bucket with signed URLs and strict ownership rules; do not reuse the public profile bucket.

---

### D22 — No email/push delivery

**Location:** `notifications` collection, `DashboardTopbar`, admin notification pages.

**Evidence:** In-app records only. No email provider, push service, service worker, or scheduled job exists.

**Impact:** Users only see replies when they open the dashboard; time-sensitive support/workout reminders are not delivered.

**Severity:** Low/Medium.

**Suggested solution:** Add a server-side notification worker/provider. Keep in-app records as the source of truth.

---

### D23 — Stale historical audit documents remain at repository root

**Location:** `PROJECT_AUDIT.md`, `BACKEND_AUDIT.md`, `BACKEND_IMPLEMENTATION_REPORT.md`, `IMPLEMENTATION_REPORT.md`, `BACKEND_TEST_RESULTS.md`.

**Evidence:** `PROJECT_AUDIT.md` says there is no Firestore/backend and AI Coach is locked; that predates the current implementation. These files are not marked superseded.

**Impact:** Future agents may trust stale architecture claims.

**Severity:** Low/Medium.

**Suggested solution:** Move historical audits to `docs/archive/` with dates/status, or add a prominent header pointing to `docs/architecture/MASTER_PROJECT_MAP.md`. Do not delete evidence without approval.

---

### D24 — Unused `copy-ort-wasm.mjs`

**Location:** `scripts/copy-ort-wasm.mjs`.

**Evidence:** No package script references it. The recommendation inference comment says local ORT import was abandoned and the file was superseded by CDN loading.

**Impact:** Confusion about the supported ORT delivery path.

**Severity:** Low.

**Suggested solution:** Remove it or document it as a legacy fallback.

---

### D25 — `supabase` CLI package is a runtime dependency

**Location:** `package.json`.

**Evidence:** `supabase` appears in `dependencies`, but no application source imports it. The Edge Function uses Deno imports.

**Impact:** Larger install surface and dependency drift; CLI belongs in dev tooling if used at all.

**Severity:** Low.

**Suggested solution:** Move to `devDependencies` or remove if deployment is handled externally.

---

### D26 — Account/role checks depend on a client-readable admin record

**Location:** `src/features/admin/useAdminAccess.ts`, `firestore.rules`.

**Evidence:** A signed-in user can `get` their own `adminUsers/{uid}` record, including role/permissions, even when inactive. The client then decides access. Rules enforce admin-only operations, but the UI status can be probed.

**Impact:** Limited information disclosure; no privilege escalation because rules check role/active. Still, client-side role logic is not the boundary.

**Severity:** Low.

**Suggested solution:** Keep rules as the boundary, avoid relying on client state for sensitive decisions, and consider custom claims for admin roles if scale demands it.

---

## 3. Suggested remediation sequence

1. **Define the medical-data policy** and make all UI/comments truthful. (D2)
2. **Move recommendation generation/persistence server-side**, then set `workout_recommendations` writes to `if false`. (D1)
3. **Enforce suspension in rules/backend**, not only UI. (D3)
4. **Add rules/emulator and storage tests**, plus a staging multi-user smoke test. (D6)
5. **Connect or relabel admin content collections.** (D4)
6. **Fix AI workout source labeling** and add a regression test. (D5)
7. **Make Overview AI-aware and label/remove remaining sample content.** (D8)
8. **Add recommendation monitoring to admin.** (D7)
9. **Address scalability:** server pagination, counters, fewer collection-group reads. (D17)
10. **Clean up dead code, unused static datasets, stale labels, and dependencies.** (D13–D16, D20–D25)

---

## 4. Debt that is intentional / acceptable for the current stage

- Demo mode and localStorage fallback are deliberate.
- Browser-local AI inference was a deliberate architecture choice for the current stage.
- Public profile-image read is a deliberate trade-off for simple `<img>` URLs.
- Client-side route guards are acceptable as UX if Firestore rules remain the data boundary.
- The review must not treat the synthetic SmartFit 100% metrics as production evidence; the reports already state this.
