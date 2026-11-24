# Forge Athletic — Screenshot Index

All screenshots are genuine captures from the running member application at `http://127.0.0.1:4181`, signed in with the provided Firebase test account. The public landing page and admin panel are excluded.

- **Desktop viewport:** 1920 × 1080
- **Mobile viewport:** 390 × 844
- **Format:** PNG
- **Total screenshots:** 41 (22 desktop, 19 mobile)

| Screenshot | Feature / page | What it shows | Type | Status |
|---|---|---|---|---|
| `02-quick-start/quick-start-form.png` | Quick Start | Prefilled Quick Start profile form, step 1 of 4; not submitted | Desktop | Captured |
| `01-dashboard/member-dashboard.png` | Dashboard | Command center, current chapter, AI plan card, next workout and quick actions | Desktop | Captured |
| `01-dashboard/member-dashboard-full.png` | Dashboard | Complete dashboard including stats, activity, achievements and profile readiness | Desktop, full page | Captured |
| `03-missions/missions-overview.png` | My Missions | Profile strength, 7/7 mission completion and safety guidance | Desktop | Captured |
| `03-missions/missions-overview-full.png` | My Missions | Complete mission grid with all seven profile dimensions | Desktop, full page | Captured |
| `04-ai-recommendations/workout-recommendation.png` | AI Workout Recommendation | Existing saved AI plan, confidence, safety and model details | Desktop | Captured |
| `04-ai-recommendations/workout-recommendation-full.png` | AI Workout Recommendation | Full recommendation page with seven-day schedule and model panel | Desktop, full page | Captured |
| `05-workout/my-workout.png` | Workout Plans | Active AI training block, weekly schedule and training summary | Desktop | Captured |
| `05-workout/my-workout-full.png` | Workout Plans | Complete workout plan, upcoming sessions, history and libraries | Desktop, full page | Captured |
| `05-workout/workout-player.png` | Workout Player | Interactive session player with timer, exercise, sets and progress | Desktop | Captured |
| `06-ai-coach/ai-coach-interface.png` | AI Coach | Idle camera form-check interface and three supported exercises | Desktop | Captured |
| `06-ai-coach/ai-coach-camera-live.png` | Exercise Camera / Form Feedback | Live pose overlay, reps, timer, form quality and detection metrics from the trained model | Desktop | Captured |
| `06-ai-coach/ai-coach-session-summary.png` | Workout Results / Exercise Feedback | Completed set summary with model windows and session values; session was not saved | Desktop | Captured |
| `07-nutrition/nutrition-tracker.png` | Nutrition Tracking | Daily nutrition summary, macro reference, hydration and meal log | Desktop | Captured |
| `07-nutrition/nutrition-tracker-full.png` | Nutrition Tracking | Full nutrition page including weekly intake and guidance | Desktop, full page | Captured |
| `08-progress/progress-dashboard.png` | Progress Tracking | Measurement summary, body-weight chart, workout frequency and AI sessions | Desktop | Captured |
| `08-progress/progress-dashboard-full.png` | Progress Tracking | Complete progress page with goal context and AI form history | Desktop, full page | Captured |
| `09-lifestyle/lifestyle-recovery.png` | Lifestyle / Recovery | Sleep, movement, stress, recovery habits and check-in controls | Desktop | Captured |
| `09-lifestyle/lifestyle-recovery-full.png` | Lifestyle / Recovery | Full lifestyle page including sleep chart and recovery notes | Desktop, full page | Captured |
| `10-profile/member-profile.png` | User Profile / Settings | Profile identity, body details, connected services and preferences | Desktop | Captured |
| `10-profile/member-profile-full.png` | User Profile / Settings | Complete settings page including privacy and data-storage explanation | Desktop, full page | Captured |
| `11-help-desk/help-desk-new-ticket.png` | Help Desk | New support-ticket form with subject, category and description | Desktop, modal crop | Captured — ticket list unavailable |
| `12-mobile-screenshots/member-dashboard-mobile.png` | Mobile Dashboard | Responsive dashboard header, current chapter and bottom navigation | Mobile | Captured |
| `12-mobile-screenshots/member-dashboard-mobile-full.png` | Mobile Dashboard | Complete responsive dashboard | Mobile, full page | Captured |
| `12-mobile-screenshots/missions-overview-mobile.png` | Mobile Missions | Responsive mission overview and progress | Mobile | Captured |
| `12-mobile-screenshots/missions-overview-mobile-full.png` | Mobile Missions | Complete responsive mission grid | Mobile, full page | Captured |
| `12-mobile-screenshots/workout-recommendation-mobile.png` | Mobile AI Plan | Responsive AI recommendation header and active plan | Mobile | Captured |
| `12-mobile-screenshots/workout-recommendation-mobile-full.png` | Mobile AI Plan | Complete responsive AI plan | Mobile, full page | Captured |
| `12-mobile-screenshots/my-workout-mobile.png` | Mobile Workout | Responsive workout plan summary and schedule | Mobile | Captured |
| `12-mobile-screenshots/my-workout-mobile-full.png` | Mobile Workout | Complete responsive workout page | Mobile, full page | Captured |
| `12-mobile-screenshots/ai-coach-interface-mobile.png` | Mobile AI Coach | Responsive AI Coach header and camera form-check interface | Mobile | Captured |
| `12-mobile-screenshots/ai-coach-interface-mobile-full.png` | Mobile AI Coach | Complete responsive AI Coach page | Mobile, full page | Captured |
| `12-mobile-screenshots/nutrition-tracker-mobile.png` | Mobile Nutrition | Responsive daily nutrition summary | Mobile | Captured |
| `12-mobile-screenshots/nutrition-tracker-mobile-full.png` | Mobile Nutrition | Complete responsive nutrition page | Mobile, full page | Captured |
| `12-mobile-screenshots/progress-dashboard-mobile.png` | Mobile Progress | Responsive progress summary and measurement controls | Mobile | Captured |
| `12-mobile-screenshots/progress-dashboard-mobile-full.png` | Mobile Progress | Complete responsive progress page | Mobile, full page | Captured |
| `12-mobile-screenshots/lifestyle-recovery-mobile.png` | Mobile Lifestyle | Responsive recovery summary and habits | Mobile | Captured |
| `12-mobile-screenshots/lifestyle-recovery-mobile-full.png` | Mobile Lifestyle | Complete responsive lifestyle page | Mobile, full page | Captured |
| `12-mobile-screenshots/member-profile-mobile.png` | Mobile Profile | Responsive profile and account settings | Mobile | Captured |
| `12-mobile-screenshots/member-profile-mobile-full.png` | Mobile Profile | Complete responsive settings page | Mobile, full page | Captured |
| `12-mobile-screenshots/help-desk-new-ticket-mobile.png` | Mobile Help Desk | Responsive new support-ticket form | Mobile, modal crop | Captured — ticket list unavailable |

## Not Captured

| Feature | Reason |
|---|---|
| Help Desk ticket list and support-ticket conversation | The member ticket query requires a Firestore composite index that is defined in the repository but not deployed. The page displayed an index-creation error, so no error screen was saved. |
| Generated/regenerated AI plan | The account already had a saved AI plan. Regeneration was intentionally not triggered because it writes to the account. |
| Saved AI Coach session result | The summary was captured, but “Save session” was not pressed to avoid writing account data. |
| Admin panel and public landing page | Explicitly excluded by the task. |
