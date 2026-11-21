# Forge Athletic — Backend Implementation Report

**Project root:** `F:\Fitness Coach`  
**Implementation date:** 2026-11-21  
**Architecture:** Firebase Authentication + Cloud Firestore + Supabase Storage

---

## 1. Original backend architecture

The application was a static React/Vite SPA with:

- Firebase Authentication for email/password, Google sign-in and password reset.
- No database server or API server.
- Browser `localStorage` for Quick Start profile, mission status and all activity records.
- No image upload service. Profile avatars were rendered as initials, and mission photos were preview-only.
- Browser-local ONNX/MediaPipe inference.

Full details are in `BACKEND_AUDIT.md`.

---

## 2. Firebase integration

- Reused the existing Firebase web app (`forge-11cbf`).
- Added Firestore initialisation in `src/lib/firebase.ts` using the modular SDK.
- Kept the existing Firebase Auth contract and protected-route behaviour.
- Added UID-scoped repositories in `src/services/cloud/firestoreRepository.ts`.
- Zustand stores now hydrate from local cache first, then replace/merge with Firestore data.
- Writes go through Firestore when a real authenticated Firebase user is active.
- Demo sessions remain local-only and are never written to Firestore.
- Existing local records are migrated once when the cloud has no data for that UID.
- Server timestamps are written as `updatedAt`; event dates use ISO strings for stable ordering and display.

### Sync statuses

`local`, `loading`, `saving`, `synced`, `error`.

The dashboard shows a non-blocking banner when cloud sync is unavailable. Settings shows detailed connection status and the last sync time.

### Offline behaviour

- UI writes update the local cache immediately.
- Cloud writes are serialised per store to avoid out-of-order mission/activity updates.
- Cloud operations time out after 8 seconds instead of hanging the UI.
- The app never silently claims a failed cloud write succeeded.

---

## 3. Firestore collections and data structure

All user data lives under `users/{uid}`.

### `users/{uid}`

```text
uid
fullName
email
photoURL
avatarUrl
avatarPath
avatarCleared
age
heightCm
weightKg
fitnessGoal
fitnessLevel
preferredWorkoutDays
profileCompletedAt
createdAt
updatedAt
schemaVersion
```

### `users/{uid}/missions/{missionId}`

```text
missionId
userId
status
startedAt
completedAt
answeredFields
totalFields
updatedAt
```

Sensitive medical/mission answers are deliberately not written here.

### `users/{uid}/workouts/{workoutId}`

```text
id / workoutId
userId
title
focus
completedAt
durationSeconds
exercisesCompleted
totalExercises
source
updatedAt
```

### `users/{uid}/nutrition_logs/{YYYY-MM-DD}`

```text
date
userId
meals[]
waterIntake
totals { calories, protein, carbs, fat }
updatedAt
```

### `users/{uid}/progress_records/{recordId}`

```text
id
userId
measuredAt
recordDate
weightKg
bodyFat?
waistCm?
chestCm?
restingHr?
updatedAt
```

### `users/{uid}/lifestyle_logs/{YYYY-MM-DD}`

```text
date
userId
sleepHours
sleepQuality
steps
stress
recoveryHabits[]
habits[]
updatedAt
```

### `users/{uid}/user_settings/preferences`

```text
userId
preferences {
  notifications { workoutReminders, missionNudges, weeklyReview }
  privacy { productUpdates, localAnalytics }
  reminderTime
  weightUnit
  distanceUnit
}
updatedAt
```

### `users/{uid}/ai_sessions/{sessionId}`

```text
id
userId
exercise
exerciseLabel
completedAt
durationSeconds
reps
scores[]
averageFormScore
bestFormScore
verdict
source
updatedAt
```

Only real model outputs and rep-counter values are stored. No predictions are fabricated.

### Indexes

`firestore.indexes.json` is included. Single-field indexes cover the current `orderBy` queries; composite indexes are intentionally empty until a real query requires one.

### Pagination

The current dataset is small enough to load complete histories for the dashboard. Repository functions are separated by collection so cursor/limit pagination can be added without changing the UI. A dedicated paginated history UI is **not yet implemented**.

---

## 4. Supabase bucket configuration

Only the required bucket is defined:

```text
profile-images
```

- Public read, because avatar URLs are rendered with `<img>`.
- Writes are owner-scoped by Storage policies.
- Files are stored at:

```text
profile-images/{firebaseUid}/{uniqueName}.{jpg|png|webp}
```

The SQL is in `supabase/storage-policies.sql`.

No workout-image or general upload bucket was created because the current application has no user-uploaded workout image workflow. Mission progress photos remain intentionally disabled.

---

## 5. Profile picture implementation

Added:

- `src/lib/supabase.ts` — configuration guard and Firebase-ID-token-aware client.
- `src/services/cloud/storageService.ts` — validation, upload, delete and error handling.
- `src/components/settings/ProfilePhotoCard.tsx` — preview, select, upload, replace, remove, loading and error states.
- `src/components/ui/Avatar.tsx` — image avatar with initials fallback.
- Avatar rendering in the sidebar, topbar and Settings account card.

Behaviour:

1. Validate JPEG/PNG/WebP and a 5 MB limit.
2. Show a local preview before upload.
3. Upload to `profile-images/{uid}/...`.
4. Save `avatarUrl` and `avatarPath` to the Firestore user document.
5. Delete the previous object after a successful replacement.
6. Delete the newly uploaded object if the Firestore update fails.
7. Remove the image only after the Firestore avatar fields are cleared.
8. Fall back to initials when no image exists.
9. Respect a previously removed image instead of falling back to the Google avatar (`avatarCleared`).

### Upload security paths

Preferred:

- `supabase/functions/profile-image/index.ts` verifies the Firebase ID token with Google's public certificates, then uses the service-role key server-side.

Fallback:

- Direct Supabase Storage upload with the Firebase ID token when Supabase is configured for Firebase third-party auth.

No service-role key is used in frontend code.

---

## 6. Other image upload implementation

No additional upload surface was added. The current product has no user-uploaded workout or exercise-image requirement. Mission photos are still preview-only and never sent to Supabase or Firestore.

This avoids creating unused buckets and avoids storing sensitive progress photos without an approved secure workflow.

---

## 7. Authentication integration

- Firebase Auth remains the identity provider.
- `AuthContext` now passes the authenticated UID, email, display name and photo URL into the profile store.
- Real users are hydrated from Firestore; demo users are explicitly local-only.
- Firestore rules use `request.auth.uid`, not a client-supplied owner ID.
- Login, signup, logout, password reset, protected routes and session persistence remain intact.
- The Google provider is preserved but was not exercised in automated tests because it requires an interactive account chooser.

### Important race fix

If no local profile exists, the dashboard waits for the cloud lookup before redirecting to onboarding. This prevents a returning user on a new device from being incorrectly sent through Quick Start again.

---

## 8. Firestore security rules

`firestore.rules` enforces:

- Only authenticated users may access data.
- A user can only read/write `users/{request.auth.uid}`.
- User documents must carry the matching UID.
- Nested documents must carry a matching `userId` when that field is present.
- All top-level collections and unknown paths are denied.

The rules are owner-only, not public.

---

## 9. Supabase Storage policies

`supabase/storage-policies.sql`:

- Creates/updates the public `profile-images` bucket.
- Allows public read for avatar rendering.
- Allows authenticated insert/update/delete only when the first path segment matches the Firebase JWT `sub` claim (or `auth.uid()`).
- The Edge Function path bypasses those policies only through the server-side service role.

---

## 10. Frontend pages connected to real data

| Area | Firestore connection |
| --- | --- |
| Overview | Profile, missions, workouts, AI sessions, measurements, lifestyle, preferences |
| My Missions | Mission documents under the authenticated UID |
| Mission Detail | Mission status and field progress |
| Workout Plans | Completed workout history |
| Nutrition | Daily nutrition documents, meals and water |
| Progress | Measurement records and AI session summaries |
| Lifestyle | Daily recovery documents and habits |
| Settings | Profile, preferences, avatar metadata, sync status |
| AI Coach | Session summaries saved through the activity store |

Empty states remain professional and use real record counts. Sample programme templates are labelled separately.

---

## 11. Service modules and files created

### Firebase / data

- `src/lib/firebase.ts`
- `src/lib/firestore.ts`
- `src/services/cloud/firestoreRepository.ts`
- `src/services/cloud/errors.ts`
- `src/types/cloud.ts`
- `src/hooks/useDataStatus.ts`
- `src/store/useProfileStore.ts` (cloud-aware)
- `src/store/useActivityStore.ts` (cloud-aware)

### Supabase / images

- `src/lib/supabase.ts`
- `src/services/cloud/storageService.ts`
- `src/components/settings/ProfilePhotoCard.tsx`
- `src/components/ui/Avatar.tsx`
- `supabase/storage-policies.sql`
- `supabase/functions/profile-image/index.ts`

### Firebase deployment

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`

---

## 12. Environment variables

### Already present

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

### Added for Supabase

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_UPLOAD_FUNCTION_URL=
```

### Local emulator testing only

```env
VITE_USE_FIREBASE_EMULATORS=
```

Never add `SUPABASE_SERVICE_ROLE_KEY` (or `STORAGE_SERVICE_ROLE_KEY`) to `.env` or any `VITE_` variable.

---

## 13. Tests performed and actual results

Detailed status is in `BACKEND_TEST_RESULTS.md`.

Summary:

- Firestore security rules emulator: **15/15 PASS**.
- End-to-end Firestore emulator with a real signup flow: **PASS**.
- Data reconstruction after deleting local cache and reloading: **PASS**.
- Rapid mission start → complete ordering: **PASS** after removing undefined Firestore fields and serialising writes.
- Real Firebase Auth login and session reload: **PASS** with a temporary test account that was deleted afterwards.
- Real Firestore connection: **PASS** — database is live and the full profile/activity round-trip succeeded.
- Live Firestore rules: **FAIL** — the current console rules are permissive; deploy `firestore.rules` before production.
- Supabase Storage upload/replace/delete: **BLOCKED** — credentials are present but `forge.supabase.co` does not resolve.
- Image validation and path traversal guard: **PASS**.
- Real-account fallback with Firestore unavailable: **PASS** — data saved locally and surfaced a sync warning.
- Responsive sweep: **104 checks, 0 overflow, 0 missing H1, 0 console errors**.
- AI model regression: **PASS** — 5/5 reps each, parity deltas unchanged, same ONNX outputs.
- Production build: **PASS**.
- Model checksums: **PASS** — unchanged from the audit.

---

## 14. Security checks performed

- Firestore rules deny anonymous access.
- Users cannot read or write another user's document.
- Users cannot write another user's `userId` into their own subcollection.
- Top-level collection writes are denied.
- Service-role key is absent from the frontend bundle.
- `.env` is ignored by Git.
- `.env.example` contains placeholders only.
- Upload path is forced under the authenticated UID.
- Client-side upload deletion refuses paths outside the user's folder.
- File type and size are validated before upload.
- No medical/mission answers are written to Firestore or Supabase.
- No AI model files were modified.

---

## 15. Failures and incomplete integrations

1. **Live Firestore rules are still permissive.** The database is live and the app works, but authenticated test writes were accepted beyond the intended owner-only rules. Deploy `firestore.rules` before real use.
2. **Supabase URL is invalid.** `forge.supabase.co` returns `ENOTFOUND`; use the exact project URL from Supabase Project Settings → API.
3. **Firestore rules are verified in the emulator but not yet deployed to the real project.**
4. **Google sign-in** was preserved but not automated.
5. **Account deletion** requires a trusted server operation to delete the Firebase Auth user and all Firestore data. The UI marks it as unavailable.
6. **Paginated history UI** is not implemented; current histories load in full.
7. **Mission photos** remain preview-only by design.
8. **Email/push notifications** are preference records only; no provider is connected.

---

## 16. Remaining manual setup steps

1. ~~Enable Cloud Firestore~~ — done.
2. ~~Create the default Firestore database~~ — done.
3. **Deploy `firestore.rules` immediately**; the current live rules are permissive.
4. **Correct the Supabase project URL** — `forge.supabase.co` does not resolve.
5. Create the public `profile-images` bucket.
6. Run `supabase/storage-policies.sql`.
7. Deploy `supabase/functions/profile-image`.
8. Confirm `.env` contains the corrected URL, publishable key and function URL.
9. Set `FIREBASE_PROJECT_ID`, `STORAGE_URL` and `STORAGE_SERVICE_ROLE_KEY` as Edge Function secrets. Secret names may not start with `SUPABASE_`, which is why the custom `STORAGE_` names are used; the platform-injected values remain as a fallback.
10. Restart the Vite dev server.
11. Re-run the live Supabase upload and cross-user tests.
