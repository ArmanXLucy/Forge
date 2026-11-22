# Forge Athletic — API Reference

---

## 1. Verified application API endpoints

**None.**

This repository contains no Express/Next/Fastify/Nest server, no `/api` route tree, no serverless function directory for member data, and no API gateway configuration. `vercel.json` is a pure SPA rewrite:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

All member/admin “API” behavior is either:

1. Firebase client SDK calls to managed Firebase services, or
2. Direct calls to a Supabase Edge Function for profile images, or
3. Static asset fetches.

There is no REST/GraphQL endpoint for missions, plans, workouts, nutrition, progress, AI inference, or admin actions.

---

## 2. Supabase Edge Function — profile image

**Source:** `supabase/functions/profile-image/index.ts`  
**Configured URL:** `VITE_SUPABASE_UPLOAD_FUNCTION_URL` (value intentionally not documented)  
**Bucket:** `profile-images`  
**Function JWT verification:** disabled at the platform level; Firebase token verified in code.

### Endpoint summary

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `OPTIONS` | Function URL | none | CORS preflight |
| `POST` | Function URL | Firebase ID token in `Authorization: Bearer …` | Upload a profile image |
| `DELETE` | Function URL | Firebase ID token | Delete a profile image |

### `OPTIONS`

Response:

```http
200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Methods: POST, DELETE, OPTIONS
```

### `POST` upload

Request:

```http
POST {VITE_SUPABASE_UPLOAD_FUNCTION_URL}
Authorization: Bearer <Firebase ID token>
Content-Type: multipart/form-data

file:    JPEG | PNG | WebP, non-empty, <= 5 MB
oldPath: optional string, must start with "{verifiedUid}/"
```

Validation:

- Firebase JWT signature, issuer `https://securetoken.google.com/{FIREBASE_PROJECT_ID}`, audience project ID, non-empty subject.
- File MIME must be `image/jpeg`, `image/png`, or `image/webp`.
- File size ≤ 5 MB.
- Path is generated server-side as `{uid}/avatar-{timestamp}-{8 random chars}.{ext}`.

Success response:

```json
{
  "url": "https://<project>.supabase.co/storage/v1/object/public/profile-images/<uid>/avatar-...",
  "path": "<uid>/avatar-..."
}
```

Error responses (JSON `{ "error": string }`):

| Status | Condition |
|---|---|
| 400 | No file, invalid file, invalid delete path, Supabase upload/remove error |
| 401 | Missing/invalid Firebase token, or unexpected verification error |
| 405 | Method other than POST/DELETE/OPTIONS |
| 413 | File > 5 MB |
| 415 | Unsupported MIME type |
| 500 | Storage URL/service role not configured |

Side effects:

- Uploads an object with `cacheControl: 3600`, `upsert: false`.
- If `oldPath` is supplied and starts with the verified UID, removes the old object after a successful upload.
- Does not write Firestore. The browser writes `avatarUrl`/`avatarPath` afterward.

**Frontend caller:** `uploadThroughFunction()` in `src/services/cloud/storageService.ts`, invoked by `ProfilePhotoCard`.

### `DELETE` image

Request:

```json
{
  "path": "<uid>/avatar-..."
}
```

Headers:

```http
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
```

Validation: path must start with `{verifiedUid}/`.

Success:

```json
{ "ok": true }
```

Errors:

| Status | Condition |
|---|---|
| 400 | Missing/invalid path, Supabase removal error |
| 401 | Missing/invalid Firebase token |
| 500 | Storage not configured |

**Frontend caller:** `deleteProfileImage()` in `storageService.ts`, invoked by `ProfilePhotoCard` after avatar removal/replacement.

### Direct Supabase Storage fallback

If `VITE_SUPABASE_UPLOAD_FUNCTION_URL` is absent but Supabase is configured, `storageService.ts` uses:

```text
supabase.storage.from('profile-images').upload(path, file, ...)
supabase.storage.from('profile-images').getPublicUrl(path)
supabase.storage.from('profile-images').remove([path])
```

This is the Supabase Storage HTTP API, not an application endpoint. It depends on Firebase third-party auth and the policies in `supabase/storage-policies.sql`.

---

## 3. Firebase client operations (not HTTP routes)

The browser uses the Firebase JS SDK. These are logical operations, not application REST endpoints. The SDK internally talks to Firebase-managed services.

### Authentication

| Operation | SDK call | Caller |
|---|---|---|
| Observe session | `onAuthStateChanged` | `AuthProvider` |
| Email/password login | `signInWithEmailAndPassword` | `authService.signIn` |
| Email/password signup | `createUserWithEmailAndPassword` + `updateProfile` | `authService.signUp` |
| Google login | `signInWithPopup` | `authService.signInWithGoogle` |
| Password reset | `sendPasswordResetEmail` | `authService.sendPasswordReset` |
| Sign out | `signOut` | `authService.signOut` |

### Firestore member data

| Operation | Function | Collections |
|---|---|---|
| Read/ensure user | `getUserRecord`, `ensureUserAccount` | `users/{uid}` |
| Save profile | `saveUserProfile` | `users/{uid}` |
| Update avatar metadata | `updateUserAvatar` | `users/{uid}` |
| Read/save mission progress | `getMissionProgress`, `saveMissionProgress` | `users/{uid}/missions` |
| Read/save mission answers | `fetchMissionAnswers`, `persistMissionAnswers` | `users/{uid}/mission_answers` |
| Read/save/deactivate plans | `fetchRecommendations`, `persistRecommendation`, `deactivateRecommendations` | `users/{uid}/workout_recommendations` |
| Read/save/delete workouts | `getWorkouts`, `saveWorkout`, `deleteWorkout` | `users/{uid}/workouts` |
| Read/save nutrition | `getNutritionLogs`, `saveNutritionDay` | `users/{uid}/nutrition_logs` |
| Read/save/delete measurements | `getMeasurements`, `saveMeasurement`, `deleteMeasurement` | `users/{uid}/progress_records` |
| Read/save lifestyle/habits | `getLifestyle`, `saveLifestyle`, `saveHabits` | `users/{uid}/lifestyle_logs` |
| Read/save AI sessions | `getAISessions`, `saveAISession` | `users/{uid}/ai_sessions` |
| Read/save preferences | `getPreferences`, `savePreferences` | `users/{uid}/user_settings/preferences` |
| Load/clear activity | `loadActivity`, `writeActivitySnapshot`, `deleteAllActivity` | multiple user subcollections |
| Delete mission progress | `deleteAllMissionProgress`, `deleteAllMissionAnswers`, `deleteAllRecommendations` | user subcollections |

### Firestore admin/support

| Operation | Function | Collections |
|---|---|---|
| Verify admin | `getAdminUser` | `adminUsers` |
| List/provision/update admins | `listAdminUsers`, `provisionAdmin`, `updateAdminRole`, `setAdminActive`, `updateAdminProfile` | `adminUsers` |
| List/detail/update users | `listAllUsers`, `getAdminUserDetail`, `updateUserAccount` | `users` + subcollections |
| Tickets | `getAllTickets`, `getUserTickets`, `getTicket`, `createTicket`, `updateTicket`, `reopenTicket` | `supportTickets` |
| Messages | `getTicketMessages`, `getAllSupportMessages`, `addTicketMessage` | `supportTickets/{id}/messages` |
| Internal notes | `getInternalNotes`, `addInternalNote` | `supportTickets/{id}/internal_notes` |
| Notifications | `listNotifications`, `getAdminNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `broadcastNotification` | `notifications` |
| Audit log | `logAdminActivity` | `adminActivityLogs` |
| Content CRUD | `listContent`, `saveContent`, `deleteContent` | `workoutPlans`, `exerciseLibrary`, `nutritionPlans` |
| Mission visibility | `getMissionSettings`, `setMissionEnabled` | `missionSettings` |
| Platform settings | `getPlatformSettings`, `savePlatformSettings` | `platformSettings/main` |
| Dashboard aggregate | `getAdminSnapshot` | users + collection groups |

---

## 4. Static asset contracts

| Method | URL | Response | Caller |
|---|---|---|---|
| GET | `/models/workout_recommendation.onnx` | ONNX binary | `workout-recommendation/lib/inference.ts` |
| GET | `/models/feature_schema.json` | JSON schema | `inference.ts` |
| GET | `/models/form_classifier_squat.onnx` | ONNX binary | `ai-coach/lib/modelClient.ts` |
| GET | `/models/form_classifier_bicep_curl.onnx` | ONNX binary | `modelClient.ts` |
| GET | `/models/form_classifier_push_up.onnx` | ONNX binary | `modelClient.ts` |
| GET | `/models/model_metadata.json` | JSON metadata | `modelClient.ts`, admin hooks |
| HEAD | `/models/form_classifier_*.onnx` | availability | `useModelMetadata.ts`, admin overview |
| GET | `/model-check-fixture.json` | JSON fixture | `public/model-check.html` |

The recommendation copy is produced from `workout-recommendation/artifacts/` by `scripts/copy-model-assets.mjs` during `predev`/`prebuild`.

---

## 5. Third-party runtime dependencies

| Dependency | URL pattern | Purpose |
|---|---|---|
| jsDelivr ONNX Runtime Web | `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/` | Recommendation WASM |
| jsDelivr ONNX Runtime Web | `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/` | Form-coach ORT + WASM |
| jsDelivr MediaPipe Tasks Vision | `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/...` | Pose landmarker runtime |
| Google Cloud Storage | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/.../pose_landmarker_full.task` | Pose model |
| Google secure-token certificates | `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` | Edge Function Firebase JWT verification |

These are external network dependencies, not Forge-controlled API endpoints. Offline behavior is limited; model loading fails if CDN/Google assets are unreachable.

---

## 6. Unknowns

The following could not be verified from repository files:

- The deployed Supabase function URL and whether the function is currently deployed.
- Whether `supabase/storage-policies.sql` has been applied to the live project.
- The live Firebase project’s deployed rules match `firestore.rules` (the file is the source, not proof of deployment).
- Any external reverse proxy, CDN, or WAF in front of the static host.
- Whether the Firebase project has email verification, MFA, or additional providers enabled in the console.

See `SECURITY_ARCHITECTURE.md` and `TECHNICAL_DEBT_AND_RECOMMENDATIONS.md` for the resulting risks.
