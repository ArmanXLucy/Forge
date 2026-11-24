# Forge Athletic — Screenshot Collection Report

**Application:** Forge Athletic member workspace  
**Capture source:** Local running build at `http://127.0.0.1:4181`  
**Account:** Provided Firebase test account  
**Capture date:** 2026-11-24  
**Output:** `docs/submission-media/`

---

## 1. Total Screenshots

**41 screenshots**

- Desktop: **22**
- Mobile: **19**

All images are PNG files captured from the running application. No mockups, redesigned screens or fabricated interfaces were created.

---

## 2. Pages Successfully Captured

| Area | Captured |
|---|---|
| Quick Start | Prefilled four-step profile form, step 1 |
| Member Dashboard | Viewport and full page |
| My Missions | Viewport and full page |
| AI Workout Recommendation | Existing saved plan, viewport and full page |
| Workout Plans | Viewport and full page |
| Workout Player | Active session player |
| AI Coach | Idle interface |
| Exercise Camera Interface | Live camera/pose view |
| Workout Results / Exercise Feedback | Completed AI Coach set summary |
| Nutrition Tracking | Viewport and full page |
| Progress Tracking | Viewport and full page |
| Lifestyle / Recovery | Viewport and full page |
| User Profile / Settings | Viewport and full page |
| Help Desk | New-ticket form, desktop and mobile |
| Mobile responsive layouts | Dashboard, missions, AI plan, workouts, AI Coach, nutrition, progress, lifestyle, profile and new-ticket form |

---

## 3. Pages That Could Not Be Captured

| Page / feature | Reason |
|---|---|
| Help Desk ticket list | Firestore rejected the member ticket query because a required composite index is not deployed. The page displayed an index-creation error, so that error screen was intentionally excluded from submission media. |
| Support ticket details / conversation | No ticket list could be loaded, so no ticket detail was reachable. |
| Generated or regenerated AI plan outcome | The account already had an existing saved AI plan. The “Regenerate” action was not pressed because it writes new account data. The existing genuine plan is captured. |
| Saved AI Coach result | The session summary was captured. “Save session” was not pressed, so no workout record was written. |
| Admin panel and public landing page | Explicitly excluded by the task. |

---

## 4. Features Requiring Login or Specific User Data

- Every dashboard screenshot required the provided Firebase test account.
- The AI Plan page required completed profile missions. The account had **7/7 missions completed**, so the plan was available.
- The existing saved AI recommendation was displayed without regeneration.
- AI Coach used an actual browser camera input. A recorded push-up test video was supplied as the camera source in headless Chrome so the MediaPipe pose pipeline and ONNX form classifier could run.
- The AI Coach result shown is genuine model output for that test video: pose tracking detected the person, the form score was **34% / needs work**, and **0 reps** were detected from the test clip. This is not presented as a successful exercise demonstration.
- Help Desk required authenticated access. The new-ticket form loaded, but the list query was blocked by the missing Firestore index.

---

## 5. Screenshot Counts

### Desktop — 22

- 1920 × 1080 viewport captures.
- Full-page captures at 1920 × 1260 to 1920 × 2319.
- One 576 × 584 modal crop for the Help Desk ticket form.

### Mobile — 19

- 390 × 844 viewport captures.
- Full-page captures at 390 × 2310 to 390 × 4475.
- One 390 × 693 modal crop for the mobile Help Desk ticket form.

---

## 6. Verification Performed

- Confirmed all **41 PNG files exist**.
- Confirmed no duplicate image hashes remain.
- Confirmed desktop images are 1920 px wide and mobile images are 390 px wide.
- Confirmed full-page images extend beyond the viewport and are not clipped at the normal page height.
- Visually inspected dashboard, AI plan, workout, AI Coach, nutrition, lifestyle, profile, Help Desk form and mobile captures.
- Confirmed no browser developer tools or browser chrome are present.
- Confirmed no landing-page or admin-panel screenshots are included.
- Confirmed no passwords, API keys or private tokens are visible.
- Confirmed no source files were modified for screenshot capture.
- Confirmed no Firebase records were created, updated or deleted during capture.

**Privacy note:** The authenticated application displays the test account’s display name and email address in the sidebar/profile. These are visible in dashboard-area screenshots because they are part of the genuine signed-in interface. Review them before publishing the media publicly.

---

## 7. Issues Encountered

1. **Missing Firestore composite index for Help Desk**
   - The deployed Firestore project does not yet have the member ticket index defined in `firestore.indexes.json`.
   - The list page returned an index-creation error.
   - The Help Desk new-ticket form was captured instead, and the error screen was excluded.

2. **No accessible support ticket**
   - Without the ticket list, no conversation/detail screen could be opened.
   - No ticket was created because that would modify production data.

3. **AI Coach test media**
   - Headless Chrome used a recorded push-up video as the fake camera source.
   - Pose tracking and model scoring genuinely ran. The result was “needs work,” not a staged success state.

4. **Account information visible**
   - The signed-in UI displays the account name and email in the sidebar. No attempt was made to alter the interface.

5. **Production actions avoided**
   - No recommendation was regenerated.
   - No AI Coach result was saved.
   - No meal, measurement, recovery entry or support ticket was submitted.

---

## 8. Final Media Checklist

- [x] Screenshots taken from the actual running application
- [x] Member-facing pages only
- [x] Landing page excluded
- [x] Admin panel excluded
- [x] Desktop screenshots at 1920 × 1080
- [x] Mobile screenshots at 390 × 844
- [x] Full-page versions included for long pages
- [x] Error screens excluded
- [x] No developer tools or browser chrome
- [x] Descriptive filenames
- [x] Duplicate captures removed
- [x] Screenshot index created
- [x] Screenshot report created
