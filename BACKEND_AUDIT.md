# Forge Athletic — Backend Audit

**Audit date:** 2026-11-21  
**Project root:** `F:\Fitness Coach`  
**Scope:** existing authentication, persistent data, image handling, AI integration and deployment readiness.

---

## 1. Current architecture

| Layer | Current implementation |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite 6 |
| Routing | React Router 6 |
| Styling | Tailwind CSS 3.4 |
| Authentication | Firebase Authentication (modular SDK v11) |
| Database | **None.** Profile, missions and activity are written to `localStorage` |
| Backend API | **None.** The app is a static SPA |
| Image storage | **None.** Profile images use initials; mission photo upload is a preview-only placeholder |
| AI inference | Browser-local ONNX Runtime Web + MediaPipe Tasks Vision |
| AI model assets | Local files in `public/models` and read-only artifacts in `ml` |
| Environment | Vite variables in `.env` / `.env.example` |

The Firebase web app is configured for project `forge-11cbf` with Auth domain `forge-11cbf.firebaseapp.com`. Firebase Authentication is initialised lazily from the modular SDK.

### Important infrastructure finding

The **Cloud Firestore API is not enabled** for project `forge-11cbf`. A direct request to the Firestore REST endpoint returned:

```text
403 Cloud Firestore API has not been used in project forge-11cbf before or it is disabled.
```

No Supabase URL or key exists in `.env` or `.env.example`. Supabase Storage is therefore not configured.

These are external console/credential tasks, not code defects. The application is being changed to use cloud data when available and to fall back to an explicitly labelled local cache when the cloud is unavailable.

---

## 2. Existing authentication

- Firebase Auth with email/password, Google popup sign-in and password reset.
- Session persistence handled by Firebase Auth.
- `AuthContext` subscribes to auth state and hydrates local profile/activity stores by UID.
- Protected routes redirect unauthenticated users to `/login`.
- A demo workspace (`demo-athlete`) is available only when Firebase Auth is not configured.
- UID is the only owner identifier used by local storage keys.

### Gaps

- No server-side token verification is needed for Firebase client SDK calls, but no Firestore rules exist yet.
- User documents are never created in a database.
- No account deletion flow.
- Profile photo from Google Auth is displayed nowhere.

---

## 3. Existing data model and persistence

### Profile

- `QuickStartProfile`: name, age, height, weight, goal, experience, training days, completion timestamp.
- Stored under `forge:v1:profile:<uid>`.

### Missions

- `MissionProgress`: mission ID, status, start/completion timestamps, answered-field count.
- Stored under `forge:v1:missions:<uid>`.
- Sensitive medical answers are deliberately not persisted.
- Mission definitions are static in `src/data/missions.ts`.

### Activity

Stored as one object under `forge:v1:activity:<uid>`:

- Completed workouts.
- Meals.
- Water by date.
- Measurements.
- Lifestyle/recovery entries.
- Habits by date.
- AI session summaries and model scores.
- User preferences.

This single-document localStorage model is simple but not suitable as a cloud schema: it cannot be paginated, queried or secured per record.

### Gaps

- No per-record document IDs in the cloud.
- No server timestamps.
- No pagination.
- No cross-device sync.
- No database security rules.
- No cloud backup or conflict handling.
- UI copy still describes data as device-only.

---

## 4. Existing image handling

- Sidebar, topbar and settings render initials only.
- `DashboardSidebar` and `DashboardTopbar` read `user.photoURL` but do not render it.
- Mission detail has a **local preview only** photo picker; the file is not uploaded.
- There is no file validation, bucket, storage policy or upload service.
- No image URL is stored in any persistent record.

---

## 5. Existing AI integration

- MediaPipe Pose Landmarker loaded from CDN.
- ONNX Runtime Web loaded from CDN.
- Local ONNX classifiers:
  - `form_classifier_squat.onnx`
  - `form_classifier_bicep_curl.onnx`
  - `form_classifier_push_up.onnx`
- Feature contract: 60 float32 features, class order `["BAD","GOOD"]`.
- Session summaries (`AISessionRecord`) are saved to the local activity store.
- No model artifact needs to change for backend integration.

### Backend integration point

`useActivityStore.addAISession()` is the single write point. Cloud persistence can be added behind that method without touching inference, preprocessing, cameras or model files.

---

## 6. Missing functionality relative to the target architecture

1. Firestore database provisioning and rules.
2. Firebase SDK Firestore initialisation.
3. User profile documents.
4. Per-user mission documents.
5. Workout, nutrition, progress, lifestyle and AI-session collections.
6. Server timestamps and validation.
7. Pagination/query strategy.
8. Supabase project, bucket and policies.
9. Profile-picture upload, replace, delete and preview.
10. Avatar rendering in navigation and settings.
11. Cloud sync status and error states.
12. Migration of existing local records.
13. Cloud-backed empty/loading states.
14. Environment template for Supabase.
15. Automated security and integration tests.

---

## 7. Firebase integration requirements

### Console setup (manual, external)

1. Enable **Cloud Firestore** in the Firebase console for `forge-11cbf`.
2. Create the default database (recommended region close to Switzerland, e.g. `europe-west6`).
3. Deploy `firestore.rules` and `firestore.indexes.json` from the repository.
4. Keep Email/Password and Google providers enabled.

### Application work

- Add `getFirestore` to `src/lib/firebase.ts`.
- Add typed Firestore repository modules.
- Keep UID-scoped paths: `users/{uid}/...`.
- Enable server timestamps on writes.
- Hydrate Zustand stores from Firestore after local cache, then write through on mutations.
- Preserve local cache as an offline fallback only.
- Expose sync status and failure messages.
- Migrate existing local records once, only when the cloud has no data.

---

## 8. Supabase integration requirements

### Console setup (manual, external)

1. Create a Supabase project.
2. Create a **public** `profile-images` bucket (public read, authenticated owner write).
3. Apply `supabase/storage-policies.sql`.
4. Configure Supabase third-party auth for Firebase, **or** deploy the included `profile-image` Edge Function and set `VITE_SUPABASE_UPLOAD_FUNCTION_URL`.
5. Add the URL and anon/publishable key to `.env`.

### Application work

- Add `@supabase/supabase-js`.
- Add `src/lib/supabase.ts` with configuration guards.
- Validate MIME type, extension and size before upload.
- Store files at `profile-images/{firebaseUid}/{uniqueName}.{ext}`.
- Upload a replacement only after the new file succeeds.
- Save `avatarUrl` and `avatarPath` in the Firestore user document.
- Roll back the new object if the Firestore write fails.
- Delete the old object after a successful replacement.
- Render the avatar in the sidebar, topbar and settings.
- Never include a service-role key in frontend code.

---

## 9. Compatibility issues and risks

| Risk | Mitigation |
| --- | --- |
| Firestore API disabled | Detect failure, keep local cache, show clear sync error; console action required |
| Supabase credentials absent | Disable upload with an explicit configuration message; do not fake success |
| Cross-provider auth (Firebase user, Supabase Storage) | Use Supabase Firebase third-party auth, or Edge Function verification with service role |
| Existing localStorage data | One-time migration only when cloud is empty; local cache retained |
| Duplicate records | Use existing stable record IDs as Firestore document IDs |
| Sensitive medical data | Continue to keep mission form answers ephemeral; do not add them to Firestore |
| AI model changes | No changes to `ml/` or `public/models`; session writes only |
| Large histories | Per-record documents and descending timestamp queries; pagination helpers added |
| Offline/network failures | Optimistic local write + retryable sync status; UI does not pretend the cloud write succeeded |
| Secrets in bundle | Only Firebase web config and Supabase anon/publishable key are public; service role stays in Edge Function env |

---

## 10. Decision

- **Firestore:** client SDK, UID-scoped documents, owner-only rules, server timestamps, per-record writes.
- **Supabase Storage:** profile-images bucket, public read for avatars, owner-only writes. Preferred secure path is the Edge Function because it verifies the Firebase ID token before using the service role. Direct browser upload is supported only when Supabase Firebase third-party auth is configured.
- **Local cache:** retained for offline resilience and demo mode, but clearly distinguished from cloud records.
- **No AI changes:** inference code and model artifacts are outside the backend change surface.
