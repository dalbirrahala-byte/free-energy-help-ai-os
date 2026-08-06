# Release Checklist — Version 1.0 RC1

Status as of this pass. Re-run this whole list before actually declaring RC1 ready — several items are blocked on the RLS migrations being applied, which has not happened yet (deliberately — see [SUPABASE_RLS.md](./SUPABASE_RLS.md)).

## Security & reliability validation

| Check | Status | Notes |
|---|---|---|
| Unauthenticated access denied | ✅ Verified | Full redirect matrix tested live: `/`, `/leads`, `/leads/1`, `/leads/2`, `/customers`, `/tasks` all return `307` to `/login?redirectTo=<path>` when signed out |
| Public routes remain accessible | ✅ Verified | `/login`, `/business-energy-quote`, `/leads/web/[ref]` all return `200`, no redirect |
| Authenticated access allowed correctly | ⚠️ Not verified | Requires a real Supabase Auth user, which requires applying the `user_roles` migration and bootstrapping an admin — not done in this pass (see [SUPABASE_RLS.md](./SUPABASE_RLS.md)) |
| Each role's permissions | ✅ Verified (unit) | 11 tests in `lib/auth/roles.test.ts` cover every role × permission combination |
| Direct URL protection | ✅ Verified | Same redirect matrix — protection is middleware-level, not link-hiding |
| Server Action protection | ✅ Implemented, ⚠️ not integration-tested | `requireOperationalPermission` wired into 4 real mutations; needs a real signed-in user of each role to exercise end-to-end |
| RLS read/insert/update/delete policies | ⚠️ Not tested | Migrations written, not applied — see the manual test checklist in [SUPABASE_RLS.md](./SUPABASE_RLS.md), to be run on staging first |
| Denied cross-role action | ✅ Verified (unit) | `requirePermission` throws `PermissionDeniedError` for every denied combination; audit event confirmed to fire on denial |
| No anon table access | ⚠️ Not applied yet | No policy grants `anon` anything in the RLS migration — correct by design, unverified live until applied |
| Audit event creation | ✅ Verified (unit) | 9 tests in `lib/audit/log.test.ts`; live persistence unverified until the audit migration is applied |
| Audit data protection | ✅ By design | Only `admin` can SELECT; no UPDATE/DELETE policy for any role (append-only) |
| Session expiry | ⚠️ Not tested | No manual expiry test run in this pass |
| Logout | ✅ Implemented | Wired to a real Server Action; not exercised end-to-end without a real user |
| Graceful database failure | ✅ Verified | Role lookup and audit logging both fall back safely (tested: `recordAuditEvent` never throws even when the client itself throws) |
| No secrets in logs | ✅ Verified | Login failure logging includes only the email domain, never the full address or password; no `.env.local` value has been printed at any point this session |
| Current CRM behaviour preserved | ✅ Verified | Full regression suite + `npm run check` + `npm run build` all pass; Gate 7/Mission Control features from earlier in this session re-validated unaffected |

## Test suites

| Suite | Result |
|---|---|
| Full existing regression suite | ✅ 144/144 pass |
| New auth tests (`roles.test.ts`) | ✅ 11/11 pass |
| New audit tests (`log.test.ts`) | ✅ 9/9 pass |
| New RBAC/RLS policy tests | ⚠️ Not possible without a live database — replaced by the manual checklist in [SUPABASE_RLS.md](./SUPABASE_RLS.md) |
| `npm run check` (typecheck + lint + build) | ✅ Pass — 0 errors, 8 pre-existing unrelated warnings |
| `npm run build` | ✅ Pass — 25 routes generated, including new `/login` |

## Browser validation

| Route | Result |
|---|---|
| `/login` | ✅ Renders correctly, no runtime errors |
| `/` | ✅ Redirects to `/login?redirectTo=%2F` when signed out |
| `/leads` | ✅ Redirects to `/login?redirectTo=%2Fleads` when signed out |
| `/leads/1` | ✅ Redirects to `/login?redirectTo=%2Fleads%2F1` when signed out |
| `/leads/2` | ✅ Redirects to `/login?redirectTo=%2Fleads%2F2` when signed out |

Signed-in browser validation (viewing the actual pages as an authenticated user of each role) was **not performed** — it requires a real user account, which requires applying the RBAC migration first. This is the single largest remaining validation gap and the natural next step once the migrations are applied to a staging project.

## Rollback validation

| | Status |
|---|---|
| Feature flags (Gate 7 engines, from earlier this session) | ✅ Both default off; rollback re-confirmed unaffected by this pass |
| Auth/RBAC/RLS/audit migrations | ✅ Each migration file includes its own tested-by-inspection rollback SQL (drop policies, disable RLS, drop tables) — not executed, since the forward migration hasn't been applied either |
| A bug in this pass's application code | ✅ Standard `git revert` — no destructive or hard-to-reverse code change was made |

## Backup and release checkpoint

| Item | Status |
|---|---|
| Verified project backup | ❌ Not performed this pass — requires action outside this environment |
| Database backup procedure | ❌ Not documented — Version 1.0 gap, see Final Report |
| Restore steps documented and tested | ❌ Not done |
| External-drive backup | ❌ Cannot be performed or verified by this tool — physical/manual action |
| Current Git commit recorded | ⚠️ Not committed — all changes in this pass remain uncommitted working-tree changes pending your review |
| Push to remote | Not done — explicitly instructed not to |

## Overall RC1 readiness

**Not ready to declare RC1.** Security infrastructure (auth, RBAC, audit logging service layer) is built and validated to the extent possible without a live database session. The critical path to actual readiness is: apply the three migrations to a staging Supabase project → run the manual RLS checklist → bootstrap a real admin user → complete signed-in browser validation for each role → then, separately, close the quote/contract commercial-workflow gap described in [CUSTOMER_LIFECYCLE.md](./CUSTOMER_LIFECYCLE.md) → then address backup/restore, which has not been started. See the Final Report for the full remaining-blockers list and recommended release decision.
