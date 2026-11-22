# Phase 1 — Security Test Report

**Project:** Forge Athletic  
**Date:** 2026-11-22  
**Rules under test:** `firestore.rules` (Phase 1 hardened)  
**Emulator:** Cloud Firestore Emulator v1.19.8, project `forge-phase1-rules`, port 8080  
**Test file:** `tests/firestore.rules.test.ts`  
**Runner:** Vitest 2.1.9 + `@firebase/rules-unit-testing` 4.0.1

---

## 1. Execution

```bash
npm run test:rules
```

The script starts an emulator-only environment through:

```text
npx --yes firebase-tools@13.35.1 emulators:exec --only firestore
  --project forge-phase1-rules
  "npx vitest run tests/firestore.rules.test.ts"
```

No production Firebase project, rules, data, or functions were contacted or modified.

### Result

```text
Test Files  1 passed (1)
Tests       34 passed (34)
Duration    ~8.9s
Exit code   0
```

`npm test` also passes the existing 55 tests. The rules suite is skipped in that command because `FIRESTORE_EMULATOR_HOST` is not set, which keeps normal unit tests independent of Java/emulator availability.

---

## 2. Test data

All fixtures are emulator-only and created through `withSecurityRulesDisabled`:

- Members: `alice`, `bob` (active), `charlie` (legacy, no `accountStatus`), `suspended`
- Admins: `super` (super_admin), `admin`, `fitness` (fitness_manager), `support` (support_manager), `analyst`, `inactive` (super_admin, active false)
- Member subcollections: mission progress, workout, health mission answers, workout recommendation
- Support tickets for alice, bob, suspended; internal note on alice’s ticket
- Notification for suspended user
- Content document `workoutPlans/plan1`
- `platformSettings/main`
- Unknown `private/secret`

No real user data was used.

---

## 3. Test results

### Authentication and member ownership (9/9)

| # | Test | Result |
|---|---|---|
| 1 | denies unauthenticated reads of private user data | PASS |
| 2 | allows a member to read their own user document | PASS |
| 3 | denies a member reading another member document | PASS |
| 4 | denies a member writing another member subcollection | PASS |
| 5 | denies a member changing accountStatus or adminNote | PASS |
| 6 | denies a member adding administrative role fields | PASS |
| 7 | allows an active member to update an ordinary profile field | PASS |
| 8 | denies creating a user document with administrator-controlled fields | PASS |
| 9 | allows a legacy active member without accountStatus to use subcollections | PASS |

### Administrator access (8/8)

| # | Test | Result |
|---|---|---|
| 10 | allows active admins to read member records | PASS |
| 11 | denies inactive admins protected operations | PASS |
| 12 | denies members listing admin records or granting themselves a role | PASS |
| 13 | allows super admins to provision an admin record | PASS |
| 14 | allows user-management admins to change account status | PASS |
| 15 | denies support managers changing account status | PASS |
| 16 | limits content collections to content roles | PASS |
| 17 | limits platform settings to the platform role | PASS |

### Account suspension (5/5)

| # | Test | Result |
|---|---|---|
| 18 | allows suspended members to read their root account document | PASS |
| 19 | denies suspended members reading member subcollections | PASS |
| 20 | denies suspended members writing protected member data | PASS |
| 21 | keeps the support and notification recovery path available | PASS |
| 22 | allows active members after the suspension is removed | PASS |

### Sensitive data and recommendation documents (6/6)

| # | Test | Result |
|---|---|---|
| 23 | allows active owners to read and write their mission answers | PASS |
| 24 | limits sensitive mission answers to user-management admins | PASS |
| 25 | limits recommendation snapshots to user-management admins | PASS |
| 26 | preserves the current owner recommendation write behavior | PASS |
| 27 | denies writing another member recommendation document | PASS |
| 28 | allows user-management admins to read collection-group sensitive data | PASS |

Test 26 is deliberately asserting the current **temporary** client-write behavior. It must be replaced with a server-only-write assertion after Phase 2.

### Support isolation (4/4)

| # | Test | Result |
|---|---|---|
| 29 | denies members reading another member ticket | PASS |
| 30 | denies members reading internal notes | PASS |
| 31 | allows support staff to read tickets and internal notes | PASS |
| 32 | denies inactive admins support access | PASS |

### Global deny (2/2)

| # | Test | Result |
|---|---|---|
| 33 | denies unknown and unauthorized collection paths | PASS |
| 34 | keeps support managers out of unrelated admin collections | PASS |

---

## 4. Failures

- No test failed.
- No allowed operation in the suite unexpectedly failed.

### Emulator log observation

Some deliberately denied writes produce Firestore rule `PERMISSION_DENIED` responses with an `evaluation error` line in the client stderr (for example protected `accountStatus` updates). The SDK treats these as permission denials and every corresponding test passed. Allowed owner and admin operations did not fail. This is logged as a diagnostics caveat, not a functional failure.

### Emulator process caveat

On this Windows machine, `firebase-tools emulators:exec` sometimes leaves the Java Firestore emulator listening on port 8080 after the command exits. If the next run reports “port taken,” terminate the leftover `cloud-firestore-emulator` Java process before rerunning. This is a local tooling issue, not application behavior.

---

## 5. Regression checks run

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run lint` (`tsc --noEmit`) | PASS |
| Existing unit tests | `npm test` | 55 passed, 34 rules tests skipped by design |
| Rules tests | `npm run test:rules` | 34 passed |
| Production build | `npm run build` | PASS (existing chunk-size warning only) |
| Dev server | `npm run dev -- --host 127.0.0.1 --port 5174` | PASS, HTTP 200 |
| Demo dashboard | Headless Chrome + seeded demo localStorage | PASS, `/dashboard` rendered |
| Mission privacy copy | Headless Chrome on `/dashboard/missions/health-profile` | PASS, accurate storage disclosure shown |
| Browser console | Headless Chrome smoke script | No console errors |

---

## 6. Untested areas

- Real Firebase project `forge-11cbf` and whether deployed rules match this file
- Multi-user production isolation with real Auth accounts
- Supabase Edge Function execution, secrets, bucket policies, and suspended-token behavior
- Storage rules (no `storage.rules`; Supabase policies are SQL, not executable here)
- Admin UI behavior with each role against live data
- Full recommendation generation in the emulator (ONNX + model assets are browser-side; domain/generator tests cover the algorithm)
- Account deletion and cross-service cleanup
- Email verification/MFA enforcement
- Deployment of `firestore.rules`

---

## 7. Verification commands for a human

```bash
# Unit tests (rules suite skipped without emulator env)
npm test

# Rules tests (starts/stops Firestore emulator)
npm run test:rules

# Type check
npm run lint

# Production build
npm run build

# Optional manual app check
npm run dev
```

Before deploying rules, run the rules suite against a staging Firebase project and verify the admin-role matrix with real admin accounts.

<!-- phase1-security-test-report-complete -->
