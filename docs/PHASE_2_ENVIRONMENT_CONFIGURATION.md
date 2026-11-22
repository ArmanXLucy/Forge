# Phase 2 — Environment Configuration

**Date:** 2026-11-23  
**Production secrets changed:** No  
**Production deployment:** No

This document lists variable **names and purposes only**. No secret values are reproduced.

---

## 1. Public frontend configuration (`VITE_`)

Vite embeds every `VITE_` variable into the browser bundle at build time. These values are public by definition. Changing one requires a new build/redeploy.

| Variable | Required | Purpose | Safe in browser |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes for real auth | Firebase Web API identifier | Yes — public identifier |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | Yes |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase web app ID | Yes |
| `VITE_SUPABASE_URL` | For profile photos | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | For profile photos | Supabase publishable/anon key | Yes, subject to RLS |
| `VITE_SUPABASE_UPLOAD_FUNCTION_URL` | Recommended | Deployed profile-image Edge Function | Yes |
| `VITE_USE_FIREBASE_EMULATORS` | Local only | Connects Auth/Firestore emulators in dev | Must remain empty/unset in production |

If any of the four Firebase values are missing, the app falls back to the demo workspace and clearly reports that Firebase is not configured. If Supabase values are missing, profile photo upload is unavailable but the app remains usable.

### Firebase API key warning

A Firebase web API key is not a server secret. It is expected to be public. Security comes from Firebase Authentication, authorized domains, App Check (if added later), and Firestore rules. Do not confuse it with a service-role key.

---

## 2. Server-only secrets

These belong only in Supabase Edge Function secrets or a trusted server environment. They must never use the `VITE_` prefix, never appear in source, and never be committed.

| Name | Used by | Purpose |
|---|---|---|
| `FIREBASE_PROJECT_ID` | `profile-image` function | Validates Firebase token issuer/audience |
| `STORAGE_URL` | `profile-image` function | Supabase project URL |
| `STORAGE_SERVICE_ROLE_KEY` | `profile-image` function | Server-side Storage access |
| `SUPABASE_URL` | Optional platform fallback | Supabase function platform value |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional platform fallback | Supabase function platform value |

The function reads `STORAGE_SERVICE_ROLE_KEY` first, then the platform `SUPABASE_SERVICE_ROLE_KEY`. It never returns the key to the client.

Configure with the Supabase CLI or dashboard. Do not paste values into documentation, tickets, screenshots, or chat.

---

## 3. Local development

1. Copy `.env.example` to `.env`.
2. Fill in the public Firebase and Supabase values.
3. Leave `VITE_USE_FIREBASE_EMULATORS` empty unless using local emulators.
4. Never commit `.env`.

`.gitignore` excludes `.env` and `.env.*`, with an exception for `.env.example`.

### Emulator mode

When `import.meta.env.DEV` and `VITE_USE_FIREBASE_EMULATORS === 'true'`, the app connects to:

- Auth: `http://127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`

This guard does not run in production builds.

---

## 4. Render Static Site

`render.yaml` declares the required public variables with `sync: false`, so Render prompts for values instead of storing them in Git.

Required values in the Render dashboard:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_UPLOAD_FUNCTION_URL`

Build command: `npm ci --include=dev && npm run build`  
Publish directory: `dist`  
Node version: `.node-version` (`22.16.0`); `package.json` engines is `>=20 <23`.

Render environment changes require a redeploy because Vite inlines values at build time.

## 5. Vercel Hobby alternative

Use the same seven public variables in Project → Settings → Environment Variables for Production and Preview. Keep `vercel.json` for SPA routing. Build command `npm run build`, output `dist`, Node 22.

Do not add server secrets to Vercel for the current architecture; there is no Vercel server function.

---

## 6. Firebase console configuration

Human verification is required:

1. Add the Render/Vercel production hostname and preview hostnames to **Authentication → Settings → Authorized domains**.
2. Confirm **Email/Password** is enabled if the form is exposed.
3. Confirm **Google** is enabled if the Google button is exposed.
4. Confirm password-reset email delivery/domain behavior.
5. Confirm the Firebase project is `forge-11cbf` and no new project was created.
6. Deploy `firestore.rules` only after staging approval.

Google sign-in from an unauthorized preview domain will fail with `auth/unauthorized-domain`. That is a configuration issue, not a code bug.

---

## 7. Supabase function configuration

Required function secrets (names only):

```text
FIREBASE_PROJECT_ID
STORAGE_URL
STORAGE_SERVICE_ROLE_KEY
```

Deployment command (requires human approval and an authenticated Supabase CLI):

```bash
supabase functions deploy profile-image --no-verify-jwt
```

`--no-verify-jwt` is intentional: the function verifies Firebase ID tokens itself. Do not change that flag without changing the function.

Also verify:

- `profile-images` bucket exists and is public-read.
- `supabase/storage-policies.sql` is applied.
- `VITE_SUPABASE_UPLOAD_FUNCTION_URL` points at the deployed function.
- The service-role key is not present in any browser bundle.

---

## 8. Security incident — tracked example file

### Finding

The tracked `.env.example` previously contained a real-looking Supabase service-role credential in comments. The value has been removed from the working file. No value is reproduced in this document.

### Required human action

1. **Rotate the Supabase service-role key now.** Removing it from a file does not invalidate it.
2. Update the Edge Function secret with the rotated key.
3. Review Supabase logs/usage for unexpected activity.
4. Consider rewriting Git history only with explicit approval; history rewriting is destructive and outside Phase 2.
5. Never place real credentials in `.env.example`.

### Current state

- `.env.example` contains names and placeholders only.
- Tracked-file scan found no `sb_secret_` value or private-key block.
- `.env` remains ignored and was not modified.
- No production secret was changed by this phase.

---

## 9. Validation checklist

- [ ] `.env` is not tracked.
- [ ] `.env.example` has no real values.
- [ ] All seven public variables exist in the host.
- [ ] No `VITE_` variable holds a service-role key.
- [ ] Firebase authorized domains include the deployment host.
- [ ] Supabase function secrets are set.
- [ ] Profile image upload works on preview.
- [ ] A production build was created after the final env change.
- [ ] Browser bundle scan shows no service-role key.
- [ ] The leaked key has been rotated.

<!-- phase2-environment-configuration-complete -->
