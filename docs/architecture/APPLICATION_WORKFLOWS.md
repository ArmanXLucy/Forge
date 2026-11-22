# Forge Athletic — Application Workflows

All workflows below reflect the current source. Where a step is absent or client-only, it is labeled.

---

## 1. Overall application architecture

```mermaid
flowchart TB
  Visitor["Visitor"] --> Public["Public SPA<br/>landing, login, signup, legal"]
  Public --> Auth["Firebase Authentication"]
  Auth --> Guard{"Authenticated?"}
  Guard -->|no| Public
  Guard -->|yes| Onboard{"Profile exists?"}
  Onboard -->|no| QuickStart["/onboarding Quick Start"]
  QuickStart --> Dash
  Onboard -->|yes| Dash["Member Dashboard"]
  Dash --> Domains["Missions · Workout Plans · AI Plan · AI Coach<br/>Nutrition · Progress · Lifestyle · Settings · Help Desk"]
  Domains --> Stores["Zustand stores"]
  Stores --> Firestore["Cloud Firestore"]
  Stores --> Local["localStorage mirror"]
  Domains --> BrowserAI["Browser AI<br/>MediaPipe + ONNX"]
  Domains --> Supabase["Supabase Storage / Edge Function"]
  AdminUser["Administrator"] --> AdminLogin["/admin/login"]
  AdminLogin --> AdminGuard{"adminUsers/{uid}<br/>active + role?"}
  AdminGuard -->|no| Denied["Access denied"]
  AdminGuard -->|yes| Admin["Admin workspace"]
  Admin --> Firestore
```

---

## 2. Frontend routing and navigation

```mermaid
flowchart TD
  Root["/"] --> Login["/login"]
  Root --> Signup["/signup"]
  Root --> Privacy["/privacy"]
  Root --> Terms["/terms"]
  Login --> Dashboard["/dashboard"]
  Signup --> Onboarding["/onboarding"]
  Onboarding --> Dashboard
  Forgot["/forgot-password"] --> Login

  Dashboard --> Missions["/dashboard/missions"]
  Missions --> MissionDetail["/dashboard/missions/:missionId"]
  Dashboard --> Workouts["/dashboard/workouts"]
  Dashboard --> AIPlan["/dashboard/workout-recommendation"]
  Dashboard --> Nutrition["/dashboard/nutrition"]
  Dashboard --> Progress["/dashboard/progress"]
  Dashboard --> Lifestyle["/dashboard/lifestyle"]
  Dashboard --> AICoach["/dashboard/ai-coach"]
  Dashboard --> Settings["/dashboard/settings"]
  Dashboard --> Help["/dashboard/help-desk"]
  Help --> Ticket["/dashboard/help-desk/:ticketId"]

  AdminLogin["/admin/login"] --> AdminOverview["/admin/overview"]
  AdminOverview --> Users["/admin/users"]
  AdminOverview --> Roles["/admin/roles"]
  AdminOverview --> Content["/admin/workouts · exercises · missions · nutrition"]
  AdminOverview --> Support["/admin/help-desk · support-analytics"]
  AdminOverview --> AIMon["/admin/ai-monitoring · ai-coach-monitoring"]
  AdminOverview --> Analytics["/admin/analytics"]
  AdminOverview --> Platform["/admin/media · notifications · settings · profile"]
```

Unknown member paths inside `/dashboard` redirect to `/dashboard`; unknown admin paths redirect to `/admin/overview`; all other paths render the 404 page.

---

## 3. Authentication workflow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Auth UI
  participant A as AuthProvider
  participant FA as Firebase Auth
  participant PS as Profile Store
  participant AS as Activity Store
  participant FS as Firestore

  alt Email signup
    U->>UI: name, email, password, terms
    UI->>FA: createUserWithEmailAndPassword
    FA-->>UI: Firebase user
    UI->>FA: updateProfile(displayName)
    UI->>A: set user
    A->>PS: hydrate(uid, cloud)
    A->>AS: hydrate(uid, cloud)
    PS->>FS: ensureUserAccount + read profile/missions/answers
    AS->>FS: load activity
    UI->>U: navigate /onboarding
  else Email login
    U->>UI: email/password
    UI->>FA: signInWithEmailAndPassword
    FA-->>A: onAuthStateChanged(user)
    A->>PS: hydrate
    A->>AS: hydrate
  else Google
    U->>UI: Continue with Google
    UI->>FA: signInWithPopup(provider)
    FA-->>A: onAuthStateChanged(user)
  else Demo
    U->>UI: Explore demo workspace
    UI->>UI: localStorage demo marker, UID demo-athlete
    UI->>A: set demo user
    A->>PS: hydrate(cloud=false)
    A->>AS: hydrate(cloud=false)
  end
```

- No email verification is required before dashboard access.
- Password reset sends a Firebase reset email; it is disabled for demo/unconfigured sessions.
- Sign-out clears both stores and the demo marker.
- `PublicOnly` routes redirect an authenticated user to `/dashboard`.
- `DashboardLayout` redirects authenticated users without a profile to `/onboarding`.

---

## 4. User data flow

```mermaid
flowchart LR
  Form["Page / form"] --> Store["Zustand store action"]
  Store --> Local["localStorage repository"]
  Store -->|cloudEnabled| FS["Firestore"]
  FS -->|read on hydrate| Store
  Local -->|read on hydrate| Store
  Store --> UI["React UI"]
  FS -. "serverTimestamp + rules" .-> FS
  Local -. "offline / demo fallback" .-> UI
```

Rules:

1. Local writes happen immediately for responsiveness.
2. Cloud writes happen asynchronously when `cloudEnabled` is true and Firebase is configured.
3. A serialized write queue and 8-second timeout wrapper prevent overlapping writes from racing.
4. On hydration, Firestore data wins when non-empty; local data is migrated to an empty cloud account.
5. If cloud sync fails, the UI remains usable in local mode and shows a banner/error.

---

## 5. My Missions workflow

```mermaid
flowchart TD
  A["Missions page"] --> B["Load mission definitions<br/>src/data/missions.ts"]
  A --> C["Load missionSettings from Firestore"]
  C --> D["Filter disabled missions"]
  B --> E["Show progress, achievements,<br/>advanced assessments"]
  E --> F["Open mission detail"]
  F --> G["Start / save for later"]
  G --> H["saveMissionAnswers<br/>localStorage + Firestore"]
  G --> I["startMission -> in_progress"]
  F --> J["Submit complete"]
  J --> K{"sensitive mission?"}
  K -->|yes| L["Confirmation dialog"]
  K -->|no| M["Persist values + mark completed"]
  L --> M
  M --> N["completeMission<br/>missions/{missionId}"]
  N --> O["Profile completion + XP update"]
```

- Mission definitions are static code, not Firestore records.
- All seven missions are initially `available`; no sequential lock is enforced.
- Advanced assessments are visually gated but are not separate routes/forms.
- Health/Nutrition “sensitive” confirmation exists, but the current code still persists the values.
- Body Metrics includes optional gender used by the recommendation model.
- Progress-photo picker is a local preview only.

---

## 6. Workout recommendation workflow

```mermaid
flowchart TD
  A["User completes all seven missions"] --> B["Persisted answers + progress"]
  B --> C["evaluateReadiness"]
  C -->|missing/invalid| D["Locked checklist<br/>no generation"]
  C -->|ready| E["buildModelInput"]
  E --> F["ONNX Runtime Web<br/>workout_recommendation.onnx"]
  F --> G["Predicted category + probabilities"]
  G --> H["generateWorkoutPlan"]
  H --> I["Template + exercise library + safety"]
  I --> J["validatePlan"]
  J -->|invalid| K["Error state<br/>nothing persisted"]
  J -->|valid| L["RecommendationDocument"]
  L --> M["Deactivate previous active plan"]
  M --> N["Firestore users/{uid}/workout_recommendations"]
  N --> O["AI Plan page + Workout Plans page"]
  O --> P["Plan outdated when authoritative answers change"]
  P -->|regenerate| F
```

Generation is entirely browser-local. The active plan is cached locally and merged with Firestore history.

---

## 7. AI Coach inference workflow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as AICoachPage
  participant P as PoseLandmarker
  participant F as FeaturePipeline
  participant O as ONNX Runtime
  participant R as RepCounter
  participant S as ActivityStore
  participant DB as Firestore

  U->>UI: Start camera or load video
  UI->>P: Load MediaPipe vision + pose task
  UI->>O: Load 3 form classifiers + metadata
  loop live
    UI->>P: detectForVideo
    P-->>UI: landmarks
    UI->>R: primary angle
    R-->>UI: reps
    UI->>UI: draw overlay, buffer frames
  end
  every ~1.8s
    UI->>F: last 180 frames
    F-->>UI: 60 features
    UI->>O: run selected classifier
    O-->>UI: p(BAD), p(GOOD)
    UI->>UI: threshold -> GOOD/needs-work + cues
  end
  U->>UI: Finish set
  U->>UI: Save session
  UI->>S: addAISession
  S->>DB: users/{uid}/ai_sessions
```

No raw frames leave the browser. Rep counting and form scoring are independent signals.

---

## 8. Workout session persistence

```mermaid
flowchart TD
  A["AI plan day or sample workout"] --> B["toWorkoutSession / static WORKOUTS"]
  B --> C["WorkoutPlayer modal"]
  C --> D["Complete sets / end session"]
  D --> E["WorkoutResult<br/>duration, exercises, sets"]
  E --> F["Save session"]
  F --> G["addWorkout"]
  G --> H["localStorage activity snapshot"]
  G -->|cloud| I["users/{uid}/workouts"]
  H --> J["Overview, Workouts, Progress"]
  I --> J
  J --> K["AI adherence and week markers"]
```

`workoutId` is `ai:{recommendationId}:{weekday}` for AI plans. `completedAiWeekdays()` reads workouts for the current week and maps the suffix back to a weekday.

---

## 9. Progress analytics workflow

```mermaid
flowchart LR
  Measurements["Logged measurements"] --> Store["useActivityStore"]
  Workouts["Completed workouts"] --> Store
  AISessions["Saved AI sessions"] --> Store
  Missions["Mission completions"] --> ProfileStore
  Store --> Progress["Progress page"]
  ProfileStore --> Progress
  Progress --> Metrics["Weight/body-fat/waist trends"]
  Progress --> Frequency["Workout frequency and active minutes"]
  Progress --> AI["AI form session summaries"]
  Progress --> Streak["computeStreak"]
  Progress --> Charts["Recharts"]
  Store -->|cloud| Firestore["Firestore activity collections"]
  Firestore -->|hydrate| Store
```

Calculations are in `src/utils/activity.ts`: `startOfWeek`, `workoutsForWeek`, `weeklySeries`, `monthlySeries`, `computeStreak`, `measurementChange`, `sleepSeries`.

There is no predictive analytics or backend aggregation. Admin analytics separately aggregates collection-group reads.

---

## 10. Nutrition and lifestyle workflows

### Nutrition

```mermaid
flowchart TD
  A["Nutrition page"] --> B["Today's meals + water"]
  B --> C["Log meal modal"]
  C --> D["addMeal"]
  D --> E["localStorage + Firestore nutrition_logs/{date}"]
  B --> F["Set water glasses"]
  F --> G["setWater -> nutrition_logs/{date}.waterIntake"]
  E --> H["Macro totals + 7-day chart"]
  G --> H
  H --> I["Static targets: 2400 kcal / 168P / 260C / 72F / 3L"]
```

- Meals and water are real user records.
- Targets and the example day are static sample content.
- No nutrition plan is generated from the recommendation model or body metrics.

### Lifestyle

```mermaid
flowchart TD
  A["Lifestyle page"] --> B["Recovery check-in"]
  B --> C["saveLifestyleEntry"]
  C --> D["localStorage + Firestore lifestyle_logs/{date}"]
  A --> E["Habit checklist"]
  E --> F["toggleHabit / setHabits -> lifestyle_logs/{date}.habits"]
  D --> G["7-day sleep chart + averages"]
  F --> G
```

---

## 11. Help Desk workflow

```mermaid
sequenceDiagram
  participant U as Member
  participant UI as Member Help Desk
  participant DB as Firestore supportTickets
  participant A as Admin Help Desk
  participant N as notifications

  U->>UI: New ticket (subject, category, description)
  UI->>DB: create ticket status=open priority=medium
  DB-->>UI: ticket + FRG-xxxxxx
  UI->>U: open ticket detail

  A->>DB: list tickets / open ticket
  A->>DB: assign, set status/priority
  A->>DB: add internal note
  A->>DB: reply
  DB->>DB: add message
  DB->>DB: ticket status=waiting_for_user, increment messageCount
  DB->>N: notification userId, type=support
  N-->>U: dashboard topbar notification

  U->>DB: reply
  DB->>DB: status=open if waiting/resolved
  U->>DB: reopen when resolved
```

- User sees only own tickets.
- Admin sees all tickets through support permissions.
- Attachments are not implemented.
- No realtime listener; pages reload after writes.
- Internal notes are never exposed to members by rules or UI.

---

## 12. Admin workflow

```mermaid
flowchart TD
  A["/admin/login"] --> B["Firebase sign-in"]
  B --> C["useAdminAccess reads adminUsers/{uid}"]
  C -->|missing/inactive| D["Access denied"]
  C -->|active admin| E["AdminLayout"]
  E --> F["Overview snapshot"]
  E --> G["Users: inspect, rename, suspend/reactivate"]
  E --> H["Roles: provision, change role, activate"]
  E --> I["Content: workoutPlans, exerciseLibrary, nutritionPlans"]
  E --> J["Missions: visibility toggles"]
  E --> K["Support: queue, ticket, reply, notes, status"]
  E --> L["AI monitoring: form models + sessions"]
  E --> M["Analytics: aggregates + CSV"]
  E --> N["Platform: media, notifications, settings"]
  G --> O["adminActivityLogs"]
  H --> O
  K --> O
```

Admin actions are client calls to Firestore. Rules verify `adminUsers` role/active state. The admin role is not a separate auth provider; it is a Firestore record attached to the same Firebase account.

---

## 13. Firebase and Supabase relationships

```mermaid
erDiagram
  FIREBASE_AUTH ||--|| USER_DOC : uid
  USER_DOC ||--o{ USER_SUBCOLLECTIONS : owns
  USER_DOC ||--o{ PROFILE_IMAGE : references
  ADMIN_USER ||--o{ USER_DOC : manages
  ADMIN_USER ||--o{ SUPPORT_TICKET : handles
  SUPPORT_TICKET ||--o{ SUPPORT_MESSAGE : has
  SUPPORT_TICKET ||--o{ INTERNAL_NOTE : has
  USER_DOC ||--o{ NOTIFICATION : receives
  USER_DOC ||--o| PLATFORM_SETTINGS : reads_indirectly

  FIREBASE_AUTH {
    string uid PK
    string email
  }
  USER_DOC {
    string uid PK
    string avatarUrl
    string avatarPath
  }
  PROFILE_IMAGE {
    string bucket "profile-images"
    string path "{uid}/avatar-*"
    string publicUrl
  }
```

Firestore owns structured data; Supabase owns only the profile image object. The Supabase Edge Function verifies Firebase identity before touching storage.

---

## 14. Profile image workflow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as ProfilePhotoCard
  participant S as storageService
  participant EF as Supabase Edge Function
  participant SB as Supabase Storage
  participant FS as Firestore users/{uid}

  U->>UI: Choose JPEG/PNG/WebP ≤5 MB
  UI->>S: validate
  U->>UI: Save photo
  S->>S: require Firebase current user + matching UID
  S->>EF: POST multipart + Firebase ID token
  EF->>EF: verify JWT with Google certs
  EF->>SB: upload {uid}/avatar-...
  EF-->>S: {url, path}
  S->>FS: set avatarUrl/avatarPath
  alt old image exists
    S->>EF: DELETE oldPath
    EF->>SB: remove old object
  end
```

If storage is configured without the function URL, `storageService` falls back to a direct Supabase upload (requires Firebase third-party auth and the storage policies). The preferred path is the Edge Function.

---

## 15. Data reset and deletion workflows

### Reset local profile cache

`resetAllData()`:

- Clears local profile, mission progress, mission answers, and recommendation cache.
- Clears in-memory profile/recommendation stores.
- Does not delete Firestore records.
- Navigates to `/onboarding`.

### Clear activity

`clearActivity()`:

- If cloud enabled, deletes `workouts`, `nutrition_logs`, `progress_records`, `lifestyle_logs`, `ai_sessions`, and defensively `workout_sessions` for the user.
- Clears local activity snapshot.
- Keeps the user profile/missions/answers.

### Account deletion

Not implemented. The UI states that account deletion requires a trusted server operation.
