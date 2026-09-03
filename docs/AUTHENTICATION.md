# Authentication — Free Energy Help AI Sales OS

Version 1.0 authentication, implemented via Supabase Auth (email/password). This document covers what exists, how it works, and what it depends on.

## Summary

| | |
|---|---|
| Provider | Supabase Auth, email/password only |
| Session mechanism | Cookie-based, via `@supabase/ssr` |
| Enforcement point | `frontend/src/middleware.ts` — one file, every route |
| Registration | None. Accounts are provisioned by an admin (see [Provisioning a user](#provisioning-a-user)) |
| Public routes | `/login`, `/forgot-password`, `/reset-password`, `/auth/confirm`, `/business-energy-quote`, `/leads/web/*` |
| Everything else | Requires a session, or redirects to `/login?redirectTo=<original path>` |

## Why middleware, not per-page checks

A single file (`src/middleware.ts`) decides route protection for the whole app. No individual `page.tsx` calls its own auth check — this keeps the blast radius of adding authentication to two files (`middleware.ts`, plus the cookie-handling fix in `lib/supabase/server.ts`) instead of dozens, and means there's exactly one place to audit for "is this actually enforced everywhere."

`middleware.ts` calls `supabase.auth.getUser()`, never `getSession()`. `getSession()` only reads the local cookie without revalidating it against Supabase — an expired or tampered session would pass. `getUser()` performs a real check and is also what triggers session-refresh cookies to be written back to the response.

**Location matters**: this project uses a `src/` directory, so `middleware.ts` must live at `src/middleware.ts`, not the project root. Next.js silently fails to load it from the wrong location — no error, no warning, it just never runs. This was caught during Phase 9 validation (see [DECISIONS.md ADR-009](./DECISIONS.md)) and is worth restating here because the failure mode is silent.

**Known deprecation**: Next.js 16 logs `The "middleware" file convention is deprecated. Please use "proxy" instead` on every build. Functionality is unaffected — confirmed via the full redirect matrix in Phase 9 — this is a naming rename Next.js wants, not a behaviour change. Tracked as a Post-Launch housekeeping item (rename `middleware.ts` → `proxy.ts`, re-verify the redirect matrix) rather than done mid-release to avoid re-testing risk for a purely cosmetic change.

## The cookie bug that would have caused silent logouts

`lib/supabase/server.ts`'s cookie handler previously had `setAll() {}` — a no-op. Supabase Auth relies on `setAll` to persist refreshed session cookies back to the response. Before this fix, session refresh would have silently failed to persist, logging users out unpredictably the moment real sessions existed. Fixed as part of Phase 3, wrapped in try/catch since Server Components are allowed to read cookies but throw if they attempt to write outside a Server Action/Route Handler.

## Login flow

`src/app/login/page.tsx` renders `LoginForm.tsx` (a client component using React 19's `useActionState`), which submits to `signIn` in `src/app/login/actions.ts`. On success, redirects to `redirectTo` (validated to be a same-site path only — rejects absolute URLs and `//host` protocol-relative tricks, closing an open-redirect path). On failure, returns exactly one message — `"Invalid email or password."` — regardless of whether the email exists or the password is wrong, so the failure path never confirms which. No error detail from Supabase is ever surfaced to the client.

## Logout flow

`src/components/layout/LogoutButton.tsx` (a small client component, used inside `AppShell`) submits to `signOut` in `src/app/login/actions.ts`, which calls `supabase.auth.signOut()` and redirects to `/login`.

## Role retrieval

`src/lib/auth/session.ts` exports `getCurrentUser()` and `requireUser()`. Role is looked up from `public.user_roles` (see [AUTHORISATION_AND_RBAC.md](./AUTHORISATION_AND_RBAC.md)) and **falls back to `read_only`** — the safest role — if the table doesn't exist yet, the lookup fails, or no row exists for the user. This means the authentication code is deployable independently of whether the RBAC migration has been applied yet, and a user with no explicit grant can never end up with more access than read-only.

`requireUser()` is defense in depth for Server Components/Actions, not the primary gate — middleware already redirects unauthenticated requests before they reach page code.

## Provisioning a user

There is no signup page, by design (no open registration was approved). To create a user for Version 1.0:

1. Create the Supabase Auth user via the Supabase dashboard or Auth Admin API.
2. Insert their role directly via the Supabase SQL editor (service-role context, bypasses RLS) — see the bootstrap note in `supabase/migrations/20260805100000_user_roles.sql` for the exact statement.

3. Set the invite redirect to `https://free-energy-help-ai-os.vercel.app/reset-password?mode=invite`.

## Required hosted Supabase email configuration

Add `https://free-energy-help-ai-os.vercel.app/**` to Authentication → URL Configuration → Redirect URLs. Set the Site URL to `https://free-energy-help-ai-os.vercel.app`.

Use this link in the hosted **Invite user** template so the app verifies the one-time token server-side and opens password creation:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password">
  Create my FEH CRM password
</a>
```

Use this link in the hosted **Reset password** template:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
  Reset my FEH CRM password
</a>
```

These token-hash links avoid depending on a session fragment or a PKCE verifier stored in the browser that requested the email. This is important when an administrator sends an invite or a user opens email on a different device. Links remain one-time and expired/reused links return to the request-reset screen.

A self-service admin UI for user/role management is Post-Launch — see [PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md).

## What this doesn't cover

- OAuth/SSO providers — none configured; only email/password.
- Admin user/role management UI — not built. User passwords must never be visible to administrators.
- Multi-factor authentication — not built. Post-Launch.
- Rate limiting on login attempts — not built; Supabase Auth has its own baseline protections, but no additional application-level throttling exists. Post-Launch if brute-force risk is assessed as material.
