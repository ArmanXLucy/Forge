# Phase 1 — Sensitive Data Inventory

**Project:** Forge Athletic  
**Purpose:** establish an accurate privacy baseline without deleting existing data or changing recommendation inputs.

---

## 1. Persistence paths

### 1.1 Mission answers

Call chain:

`MissionDetailPage` → `useProfileStore.saveMissionAnswers()` →:

1. `localRecommendationRepository.saveAnswers(uid, answers)`  
   Key: `forge:v1:mission-answers:{uid}`  
   Value: `{ [missionId]: { [fieldId]: string | number | boolean | string[] } }`

2. When cloud sync is enabled: `persistMissionAnswers(uid, missionId, values)`  
   Path: `users/{uid}/mission_answers/{missionId}`  
   Document: `{ missionId, userId, values, updatedAt, schemaVersion: 1 }`

Triggered by both “Save for later” and mission completion (including review/update).

### 1.2 Generated plans

Path: `users/{uid}/workout_recommendations/{recommendationId}`  
Local cache: `forge:v1:recommendations:{uid}`

`missionSnapshot.answers` contains only `authoritativeAnswers()` — the subset listed in section 3.2.

### 1.3 Other user records

- `users/{uid}`: profile basics, account status, avatar URL/path, email/display name.
- `users/{uid}/missions/{missionId}`: mission status, timestamps, progress counts. No form values.
- `users/{uid}/workouts/*`: workout summaries.
- `users/{uid}/nutrition_logs/*`: meals, water, totals.
- `users/{uid}/progress_records/*`: measurements.
- `users/{uid}/lifestyle_logs/*`: sleep, stress, steps, habits.
- `users/{uid}/ai_sessions/*`: AI Coach summaries and scores; no video.
- `users/{uid}/user_settings/preferences`: preferences.
- `supportTickets/*`: user-submitted ticket text, name/email supplied by client.
- Notifications: support/system messages.

### 1.4 Profile images

- Supabase Storage `profile-images` (public read).
- Firestore `users/{uid}.avatarUrl` and `.avatarPath`.
- Mission progress photos: browser preview only, never uploaded.

### 1.5 What is not persisted

- Camera frames/video.
- Mission photo files.
- Laboratory reports or medical documents (no upload feature).
- Raw MediaPipe landmarks (in memory only).

---

## 2. Mission answer inventory

| Mission | `sensitive` flag | Persisted fields | Notes |
|---|---|---|---|
| Body Metrics | false | `gender`, `weight`, `bodyFat`, `leanMass`, `restingHr`, `chest`, `waist`, `hips`, `arm`, `thigh`, `systolic`, `diastolic` | Health-adjacent measurements; treated as standard but still personal |
| Health Profile | true | `conditions`, `injuries`, `medication`, `allergies`, `clearance`, `restrictions`, `emergencyConsent` | Most sensitive category; includes free text |
| Training History | false | `experience`, `sports`, `previousRoutine`, `preferences`, `squat`, `bench`, `deadlift`, `equipment` | Preferences and performance data |
| Nutrition Profile | true | `diet`, `foodAllergies`, `intolerances`, `habits`, `water`, `cooking`, `budget`, `supplements` | Allergy/intolerance free text |
| Lifestyle Check | false | `sleepHours`, `sleepSchedule`, `recoveryHabits`, `dailyActivity`, `occupation`, `stress` | Occupation can be identifying |
| Goal Deep Dive | false | `primaryGoal`, `secondaryGoals`, `timeline`, `motivation`, `previousAttempts`, `obstacles` | Motivation free text may contain health context |
| Mindset Mission | false | `confidence`, `coachingStyle`, `checkIn`, `habit`, `weeklyTime` | Preferences |

All fields are currently persisted for every mission, even when marked non-sensitive.

---

## 3. Recommendation data

### 3.1 Model input (not persisted directly)

In-memory only, built by `buildModelInput()`:

- Age, Gender, Weight_kg, Height_cm
- Goal, Equipment, Experience
- Injury category (`None`/`Knee`/`Ankle`/`Shoulder`/`Back`)
- Derived BMI inside the ONNX pipeline

Medical free text is reduced to an injury category and never enters the model.

### 3.2 Persisted snapshot

`missionSnapshot.answers` stores:

| Mission | Fields copied |
|---|---|
| Body Metrics | `weight`, `gender` |
| Health Profile | `conditions`, `injuries`, `restrictions`, `clearance` |
| Training History | `experience`, `equipment` |
| Lifestyle Check | `sleepHours`, `stress`, `dailyActivity` |
| Goal Deep Dive | `primaryGoal`, `secondaryGoals`, `timeline` |
| Mindset Mission | `weeklyTime`, `coachingStyle`, `confidence` |

Not copied into the snapshot: medication, allergies, diet, nutrition free text, occupation, motivation, previous attempts, or other full-form fields.

### 3.3 Safety summary

The plan also stores a `safety` object with:

- `restricted`
- excluded movement patterns / injury sites
- human-readable notes, which may mention “recorded health condition”, “clearance status”, “movement restrictions”, high stress or low sleep
- `professionalReviewRecommended`

This is derived safety context, not the full medical answer.

---

## 4. Necessity for workout safety

### Required for current plan generation/safety

- Body weight, height, age, sex category → model input / BMI
- Conditions, injury text and restrictions → injury category, conservative filters, professional-review flag
- Clearance → intensity restriction and warning
- Experience, equipment → plan/equipment selection
- Goal → plan category
- Sleep, stress, daily activity → volume caps/recovery notes
- Weekly time, coaching style, confidence → session count/messaging
- Secondary goals, timeline → snapshot/outdated comparison and plan context

### Not required for the model

- Medication free text
- Allergy free text (nutrition feature is separate and static)
- Food allergies/intolerances, diet, habits, budget, supplements
- Occupation, sports background, previous routine, motivation, previous attempts
- Most circumference/body-composition fields
- Benchmarks (squat/bench/deadlift) are collected but not used by the current recommendation model
- Mission progress photos (not uploaded)

### Minimization opportunity (proposal only, not executed)

If a future migration is approved:

1. Persist health fields needed for safety under a restricted subcollection (or server-side encrypted store).
2. Stop persisting medication/allergy free text unless a medical workflow requires it.
3. Keep a derived safety summary (`conditions` categories, injury sites, clearance) for plan generation.
4. Keep nutrition free text out of workout snapshots (already true).
5. Add explicit retention and delete-account behavior before launch.

Any migration must preserve existing users’ stored answers and avoid breaking `evaluateReadiness()`, `buildModelInput()`, `authoritativeAnswers()`, or `isPlanOutdated()`.

---

## 5. Privacy statements corrected in Phase 1

| File | Before | After |
|---|---|---|
| `src/pages/Dashboard/MissionDetailPage.tsx` | Sensitive answers discarded, nothing stored | Answers saved to account/browser cache; readable by authorised user-management admins |
| `src/pages/Dashboard/SettingsPage.tsx` | “Never stored in Firestore” and “answers are never persisted” | Sensitive boundaries + explicit statement that mission answers are stored |
| `src/data/missions.ts` | “Nothing stored”, “not stored in this frontend build” | Answers saved; do not enter medical documents |
| `src/pages/Legal/PrivacyPage.tsx` | Only non-sensitive localStorage, sensitive answers not persisted | Firestore + localStorage mission answers, profile-image storage, camera exclusions |
| `src/pages/Onboarding/index.tsx` | Health details never persisted | Saved when Health Profile is submitted |
| `src/pages/Admin/MissionsPage.tsx` | “answers not stored”, “ephemeral” | Sensitive answers protected, not displayed, user-management admin only |
| `src/types/index.ts` | Sensitive must not persist | Sensitive answers do persist; copy must say so |
| `src/services/profileService.ts` | Sensitive never written to localStorage | Answers persisted separately |
| `src/components/ui/Feedback.tsx` | Answers not stored/sent | Answers saved and cached |

No existing answers were deleted, migrated, or rewritten.

---

## 6. Access control after Phase 1

- Active owner: read/write own mission answers.
- Suspended owner: cannot read/write mission answers, but can read own root user document and use support.
- `super_admin` / `admin`: can read mission answers (collection and collection-group), per user-management role.
- `fitness_manager`, `support_manager`, `analyst`: cannot read the sensitive mission-answer collection.
- Recommendation snapshots follow the same admin read restriction.
- No admin page currently displays raw mission answers.

---

## 7. Residual privacy risks

1. Medical free text is still stored in localStorage and Firestore.
2. Firestore rules limit access but do not encrypt field contents.
3. No retention schedule or account-deletion workflow exists.
4. `supportTickets` stores client-supplied `userName`/`userEmail`; identity is not server-derived.
5. Profile images are publicly readable by URL.
6. Recommendation writes remain client-controlled until Phase 2.
7. Legal copy is now accurate for the current implementation, but should be reviewed by counsel before production.

<!-- phase1-sensitive-data-inventory-complete -->
