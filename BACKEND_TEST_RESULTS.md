# Forge Athletic — Backend Test Results

**Date:** 2026-11-21  
**Environment:** Windows, Chrome 157, Node 22, Vite 6, Firebase SDK 11.10, Firestore Emulator, Auth Emulator.

**Status key**

- **PASS** — actually tested and succeeded.
- **FAIL** — tested and failed.
- **BLOCKED** — external credentials/configuration missing.
- **NOT TESTED** — not executed.

---

## A. Firebase Authentication

| Test | Status | Evidence |
| --- | --- | --- |
| Firebase initialises from `.env` | PASS | Browser module reported `isFirebaseConfigured: true`, project `forge-11cbf` |
| Email/password signup through the real Firebase project | PASS | Temporary test account created via Auth REST and signed in through `authService.signUp` |
| Email/password login through the app form | PASS | Login form submitted; landed on `/dashboard` |
| Session persists after page reload | PASS | Reload retained `uid: 6nfbZTDpDnZFeCO7OWOqNSfoRdB2` and authenticated dashboard |
| Protected-route guard | PASS | Removing the demo session redirected `/dashboard` to `/login` with the form |
| Logout | PASS | `authService.signOut()` cleared the session and returned the app to login |
| Password reset | NOT TESTED | Requires a real mailbox; existing Firebase implementation was not modified |
| Google sign-in | NOT TESTED | Requires an interactive Google account chooser |
| Temporary test account cleanup | PASS | `accounts:delete` returned success; `test-account.json` removed |

The real test account was created only for QA and deleted afterwards.

---

## B. Real Cloud Firestore

| Test | Status | Evidence |
| --- | --- | --- |
| Firestore API enabled | **BLOCKED** | REST request returned `403 Cloud Firestore API has not been used in project forge-11cbf before or it is disabled` |
| Real Firestore create/read/update/delete | **BLOCKED** | Cannot operate until Firestore is enabled and the database is created |
| Real Firestore security rules active | **BLOCKED** | Rules are written but not deployed to the real project |
| Real-account offline fallback | PASS | Data saved locally, survived reload, and Settings showed `SYNC ISSUE` / local fallback |
| Cloud sync warning visible | PASS | Dashboard banner and Settings connection card displayed the failure |
| Application remains usable while Firestore is unavailable | PASS | Overview, Nutrition and Settings loaded with 0 console errors |

---

## C. Firestore Emulator — security rules

Command:

```bash
npx firebase-tools emulators:exec --only firestore,auth --project demo-forge "node .qa/backend/rules-test.mjs"
```

Result: **15/15 PASS**.

| Rule test | Status |
| --- | --- |
| Anonymous cannot read a user document | PASS |
| Anonymous cannot write a user document | PASS |
| User creates own document | PASS |
| Owner reads own document | PASS |
| Owner updates own document | PASS |
| User cannot read another user's document | PASS |
| User cannot write another user's document | PASS |
| User cannot create a document with another UID | PASS |
| Owner writes own mission | PASS |
| Mission with another `userId` is rejected | PASS |
| Another user cannot read the mission | PASS |
| Owner writes a nutrition day | PASS |
| Owner writes preferences | PASS |
| Top-level collections are denied | PASS |
| Owner deletes own mission | PASS |

---

## D. Firestore Emulator — full application integration

A real signup was performed through the app UI against the Auth Emulator, then profile, mission, workout, nutrition, measurement, lifestyle, habit, AI session and preference records were written through the Zustand stores and Firestore repository.

| Test | Status | Evidence |
| --- | --- | --- |
| Signup through UI | PASS | Firebase emulator user created; app reached onboarding/dashboard |
| Profile saved to Firestore | PASS | `profileSync: synced`; `saveQuickStart` wrote the user document |
| Mission start → complete | PASS | After final fix, Firestore reload returned `mission: completed` |
| Workout history write | PASS | Hydrated `workouts: 1` |
| Meal write | PASS | Hydrated `meals: 1`; “Emulator lunch” visible in Nutrition after reload |
| Measurement write | PASS | Hydrated `measurements: 1` |
| Lifestyle write | PASS | Hydrated `lifestyle: 1` |
| Habit write | PASS | Hydrated `habits: 1` |
| AI session write | PASS | Hydrated `ai: 1` |
| Preferences write | PASS | `reminderTime: 07:30`, `workoutReminders: false` after reload |
| Delete all local cache keys and reload | PASS | All records reconstructed from Firestore |
| Landing path after cloud hydration | PASS | `/dashboard`, not incorrectly forced to onboarding |
| Firestore cloud status in Settings | PASS | `CLOUD CONNECTED`, `SYNCED`, `DATABASE: Firestore` |
| Sync error after the run | PASS | None |

### Bug found and fixed during this test

Firestore rejects `undefined` field values by default. Mission completion and optional measurement fields contained `undefined`, causing the cloud writes to fail and leaving a mission as `in_progress`.

Fix:

- Added `withoutUndefined()` to Firestore write data for missions, workouts, measurements and AI sessions.
- Serialised profile/activity cloud writes so rapid `startMission()` → `completeMission()` cannot land out of order.

Retest result: mission completed and all activity records were present after clearing local storage.

A transient emulator warning (`auth/network-request-failed` while the emulator was starting) appeared once but did not affect the final data or UI.

---

## E. Supabase Storage

| Test | Status | Evidence |
| --- | --- | --- |
| Supabase credentials configured | **BLOCKED** | `.env` has empty `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| Bucket created | **BLOCKED** | No Supabase project available |
| Policies applied | **BLOCKED** | SQL provided but not executed |
| Edge Function deployed | **BLOCKED** | No Supabase project/access token |
| Upload profile image | **BLOCKED** | Upload UI correctly disabled with configuration message |
| Replace profile image | **BLOCKED** | Same |
| Delete profile image | **BLOCKED** | Same |
| Public URL retrieval | **BLOCKED** | Same |
| Unauthorized object access | **BLOCKED** | Requires applied Storage policies |

No upload was simulated or marked successful without a real bucket.

---

## F. Image upload validation

| Test | Status | Evidence |
| --- | --- | --- |
| Accept PNG | PASS | `validateProfileImage()` returned no error |
| Reject text file | PASS | Returned “Use a JPEG, PNG or WebP image.” |
| Reject >5 MB file | PASS | Returned “Images must be 5 MB or smaller.” |
| Refuse path outside own folder | PASS | `deleteProfileImage('someone-else/avatar.jpg', uid)` rejected with “Refusing to delete an image outside your account folder.” |
| Demo-mode upload disabled | PASS | Upload button disabled; explanatory message shown |
| Real-account upload disabled without Supabase | PASS | Upload button disabled; configuration message shown |
| Firestore avatar update/removal | **BLOCKED** | Depends on storage upload and real Firestore |

---

## G. Frontend data integration

| Test | Status |
| --- | --- |
| Meal save and reload | PASS |
| Measurement save and reload | PASS |
| Settings toggle save and reload | PASS |
| Empty activity state | PASS (0 overflow, no errors) |
| Workout player save | PASS (existing regression suite) |
| Overview stats update from stored records | PASS |
| Sessions/AI history read from activity store | PASS |
| Cloud source labels update when sync is active | PASS |
| Local-cache notice when cloud is unavailable | PASS |
| Auth guard | PASS |
| Mobile drawer opens | PASS (drawer rendered; visible nav scrollbar hidden) |

---

## H. Responsive regression

Sweep: 8 dashboard pages × 13 viewports = **104 checks**.

Viewports:

`1280×720`, `1366×768`, `1440×900`, `1600×900`, `1920×1080`, `768×1024`, `820×1180`, `1024×768`, `320×568`, `375×667`, `390×844`, `393×852`, `430×932`.

Result:

```text
checked: 104
horizontal overflow: 0
short sidebar: 0
missing H1: 0
console errors: 0
```

Screenshots: `.qa/backend/settings-final-*.png`, `.qa/backend/settings-emulator-cloud-1440.png`.

---

## I. AI and model regression

| Test | Status | Evidence |
| --- | --- | --- |
| Rep counter, squat | PASS | 5/5 |
| Rep counter, bicep curl | PASS | 5/5 |
| Rep counter, push-up | PASS | 5/5 |
| Feature parity, squat | PASS | Δ 0.0057486, 60 features |
| Feature parity, bicep curl | PASS | Δ 0.0112892, 60 features |
| Feature parity, push-up | PASS | Δ 0.0026783, 60 features |
| ONNX squat | PASS | p(GOOD) 0.4608 |
| ONNX bicep curl | PASS | p(GOOD) 0.5054 |
| ONNX push-up | PASS | p(GOOD) 0.2939 |
| Model artifact checksums unchanged | PASS | Matches audit values |
| AI session save to local/demo | PASS | Existing activity-store path |
| AI session save to Firestore emulator | PASS | Hydrated `ai: 1` |

No files inside `ml/` or `public/models/` were modified.

---

## J. Build and secret checks

| Test | Status | Result |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | No errors |
| `npm run build` | PASS | Vite production build succeeded |
| Service-role key in frontend bundle | PASS | No `SUPABASE_SERVICE_ROLE_KEY` / `service_role` string found in `dist` |
| `.env` ignored by Git | PASS | `.gitignore` includes `.env` and `.env.*` except `.env.example` |
| Supabase service-role key in `.env` | PASS | Not present |
| Firebase API key exposure | PASS | Expected public web config; Firestore rules are the protection layer |
| Medical data in Firestore | PASS | No mission answer payload is written |
| Camera/video upload | PASS | Frames remain browser-local |

---

## K. Not tested / incomplete

| Item | Status |
| --- | --- |
| Real Firestore deployment | BLOCKED |
| Real Firestore rules behavior | BLOCKED (emulator rules PASS) |
| Real Firestore pagination at scale | NOT TESTED |
| Supabase bucket/policies | BLOCKED |
| Supabase upload/replace/delete | BLOCKED |
| Google sign-in | NOT TESTED |
| Password reset delivery | NOT TESTED |
| Account deletion | NOT TESTED — trusted server operation not implemented |
| Email/push notifications | NOT TESTED — no provider |
| Mission photo secure upload | NOT TESTED — intentionally disabled |
