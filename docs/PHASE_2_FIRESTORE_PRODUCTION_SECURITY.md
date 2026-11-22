# Phase 2 — Firestore Production Security

**Date:** 2026-11-23  
**Rules file:** `firestore.rules`  
**Emulator tests:** `tests/firestore.rules.test.ts` — 37 passing  
**Production rules deployed:** No

This document describes the rule behavior in the repository. It does not claim that production rules have been deployed or that live data has been tested.

---

## 1. Phase 1 controls preserved

- Owner-only member data.
- Suspended accounts blocked from member data and root-profile writes.
- Suspended users can read their root document and use support/notifications.
- Admin-controlled fields cannot be self-assigned.
- Sensitive mission answers and recommendation snapshots are limited to `super_admin`/`admin`.
- Support-ticket isolation and internal-note privacy.
- Content/platform role separation.
- Final deny-by-default.

Phase 2 did not weaken any of these checks.

---

## 2. Phase 2 additions

### 2.1 Mission-answer shape validation

`validMissionAnswerWrite(uid, missionId)` requires:

- `userId == uid`
- `missionId ==` document ID
- `schemaVersion == 1`
- `values` is a map
- `updatedAt` is a timestamp
- exact top-level keys only:
  `missionId`, `userId`, `values`, `updatedAt`, `schemaVersion`

This blocks extra fields such as forged admin metadata.

### 2.2 Recommendation shape validation

`validRecommendationWrite(uid, recommendationId)` requires:

- `userId == uid`
- `recommendationId ==` document ID
- `modelSource == 'onnx-web'`
- model/category/title version fields present and bounded
- `missionSnapshot` is a map with `schemaVersion == 1`, map answers, map profile
- `schedule` is a list of exactly 7 entries
- `safety` is a map
- `createdAt` is a string
- `updatedAt` is a timestamp
- boolean flags are booleans
- `version` is an integer 1–10,000
- `generationStatus` is `ready` or `superseded`
- `inferenceMs` is a number 0–600,000
- `confidence` is a number 0–1
- `classProbabilities` is a list of at most 24 entries
- exact top-level keys only:

```text
recommendationId, userId, modelVersion, modelSource,
predictedPlanCategory, planTemplateId, planTitle, fitnessGoal,
datasetGoal, missionSnapshot, schedule, safety, createdAt,
updatedAt, isActive, isOutdated, version, generationStatus,
inferenceMs, confidence, classProbabilities
```

This blocks unexpected fields and malformed schedules. It does **not** prove that a genuine AI inference occurred.

### 2.3 Closed generic bypass

The generic member-subcollection rule previously also matched `mission_answers` and `workout_recommendations`, allowing a valid owner write to bypass the specific rules. The generic create/update rule now excludes those two collections. Specific validated rules are the only write path.

This was found by the new negative tests during Phase 2.

---

## 3. Current access matrix for sensitive data

| Actor | Mission answers | Recommendations |
|---|---|---|
| Active owner | Read/write own, validated | Read/write own, validated |
| Suspended owner | Denied | Denied |
| `super_admin` / `admin` | Read | Read |
| `support_manager` | Denied | Denied |
| `analyst` | Denied | Denied |
| `fitness_manager` | Denied | Denied |
| Unauthenticated | Denied | Denied |

Collection-group reads for these two collections require `super_admin`/`admin`.

---

## 4. Browser-AI threat model

Because inference is client-side:

### What Firestore rules can enforce

- Who writes a document.
- Which user ID and path are used.
- Required fields and allowed top-level keys.
- Basic types and ranges.
- Seven-day schedule length.
- No unexpected admin fields.

### What Firestore rules cannot enforce

- That ONNX actually ran.
- That the model file was unmodified in the user's browser.
- That the predicted category, confidence, probabilities, safety notes, or plan content are genuine.
- That the client used the shipped preprocessing/thresholds.
- That the user did not fabricate a structurally valid plan in their own account.

A user can still write a plausible fake recommendation for themselves. This affects their own account data; it does not grant access to another user or admin privileges. Do not present Firestore validation as proof of AI authenticity.

---

## 5. Residual risks

| Risk | Severity | Status |
|---|---|---|
| Client can fabricate own plan | Medium | Accepted for browser-AI/free architecture |
| No server-side rate limiting | Medium | Firebase quotas are the only backstop |
| Sensitive health answers stored as plaintext | High privacy | Documented Phase 1; needs policy/migration |
| Recommendation snapshot includes health context | High privacy | Limited to owner + user-management admins |
| Rules not deployed | High | Requires approval |
| No App Check | Medium | Optional future control |
| Suspended users blocked at rules but not Supabase Function | Medium | Phase 1 gap |
| No field-level encryption | High | Out of scope for free static architecture |
| No audit trail for plan generation | Low/Medium | Client assertion only |
| Rules deployment drift | Medium | Requires staging test/backup |

---

## 6. Compatibility decisions

Client recommendation writes remain **allowed** because:

- Inference is intentionally browser-side.
- There is no free trusted backend in the architecture.
- Removing writes would break plan saving for all users.

The recommendation snapshot fields are validated, and ownership is strict. Do not flip create/update to `if false` until a trusted inference service exists. That would break the current product.

Mission-answer writes remain allowed for active owners because the recommendation and safety pipeline needs them. They now have exact-shape validation.

Admin field protection and suspension remain enforced.

---

## 7. Test coverage

The emulator suite now covers 37 cases, including:

- unauthenticated/private reads
- owner and cross-user reads/writes
- protected admin fields
- legacy active users
- admin role matrix
- inactive admins
- suspension and recovery path
- sensitive answer/admin access
- recommendation/admin access
- valid owner recommendation write
- invalid seven-day schedule
- unexpected top-level recommendation field
- unexpected mission-answer field
- cross-user recommendation write
- collection-group sensitive reads
- support isolation
- deny-all

Command:

```bash
npm run test:rules
```

Result on 2026-11-23: **37 passed, 0 failed**.

The emulator logs some expected `evaluation error` lines for deliberately denied malformed writes; those requests correctly failed.

---

## 8. Deployment requirements

Before deploying rules:

1. Back up/export the currently deployed rules.
2. Review the diff.
3. Run `npm run test:rules`.
4. Test real active/suspended accounts and each admin role in staging.
5. Confirm existing recommendation documents satisfy the stricter shape. If any legacy documents do not, plan a migration or compatibility exception first.
6. Deploy only after approval:

```bash
firebase deploy --only firestore:rules --project forge-11cbf
```

7. Smoke-test login, mission answers, plan generation, plan history, support, and suspension.

Do not deploy rules automatically from the static host.

---

## 9. Recommended next steps

1. Deploy and verify Phase 1 + Phase 2 rules.
2. Add a trusted, optional backend for plan authenticity when a free-compatible option exists.
3. Move health-answer processing to a minimized, purpose-specific schema.
4. Add App Check if it can be done without breaking local/demo flows.
5. Add rate limiting/alerting on recommendation writes.
6. Add a migration check for legacy recommendation shapes.
7. Consider server-side deletion/erasure for account deletion.

<!-- phase2-firestore-production-security-complete -->
