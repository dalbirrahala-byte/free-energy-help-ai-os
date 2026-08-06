# Authorisation & RBAC — Free Energy Help AI Sales OS

## Access model (ADR-008)

**Organisation-wide authenticated access.** Every role sees the same records — there is no per-user record ownership and no multi-tenancy in Version 1.0. This was a deliberate decision, not a shortcut: no table has an owner/agent/assignment column, so per-user scoping isn't implementable today without inventing a schema field, which the RLS phase rules explicitly forbid without separate approval. Role only gates which **operations** a user may perform, never which rows they can see.

## The five roles

`admin`, `manager`, `operations`, `consultant`, `read_only` — defined once, in `frontend/src/lib/auth/roles.ts`, the single source of truth every other layer (RLS policies, Server Actions, future UI) must agree with.

| Role | `records:view` | `records:write` | `dashboards:view` | `security:administer` | `audit:view` |
|---|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `manager` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `operations` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `consultant` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `read_only` | ✅ | ❌ | ❌ | ❌ | ❌ |

**`operations` and `consultant` are technically identical in Version 1.0.** They're organisationally distinct job functions, but there is no schema field to enforce a technical difference between them — nothing distinguishes "this lead belongs to sales" from "this lead belongs to ops." Rather than fabricate an unenforceable distinction, both get the same permission set. If a real need arises to split them (e.g., consultant can edit leads but not trigger onboarding actions), that's a genuine, separately-scoped Version 1.1+ change to the permission matrix — not a reinterpretation of today's roles.

Default role for any new `user_roles` row is `read_only` — the safest possible default, never auto-elevated.

## Where roles are stored

`public.user_roles` (`id uuid references auth.users`, `role text`) — see `supabase/migrations/20260805100000_user_roles.sql`. Not yet applied to any database; see [SUPABASE_RLS.md](./SUPABASE_RLS.md) for the apply sequence.

## The one enforcement point

`frontend/src/lib/auth/roles.ts` exports `hasPermission(role, permission)` and `requirePermission(role, permission)` — the latter throws a typed `PermissionDeniedError`, never a generic error, and never silently no-ops. `frontend/src/lib/auth/enforceWrite.ts` wraps this with session retrieval and audit logging into one call:

```ts
const user = await requireOperationalPermission("records:write");
```

Every mutating Server Action calls this before touching data. This satisfies "no duplicated role logic in pages" — the check, the session lookup, and the audit-on-denial all live in one file, called the same way everywhere.

**UI visibility is never treated as security.** Hiding a button from a `read_only` user is a UX nicety; the real enforcement is this server-side check, which runs regardless of what the client ever rendered.

## Where it's wired in today

`records:write` is enforced in the four Server Actions that perform real mutations: lead creation (`leads/new`), lead update/status change (`leads/[id]/edit`), task creation (`tasks/new`), and activity recording (`leads/[id]/activity/new`). Customer creation/update (`customers/new`, `customers/[id]/edit`) and activity deletion (`leads/[id]/page.tsx`'s `deleteActivity`) are **not yet wired to `requireOperationalPermission`** — this was scoped to the explicit Phase 6 minimum event list and is a straightforward follow-up, not a design gap; see the Final Report's remaining-blockers section.

## Testing

`frontend/src/lib/auth/roles.test.ts` — 11 tests covering every role/permission combination, the `PermissionDeniedError` shape, and that `operations`/`consultant` are provably identical (a regression test against someone later "fixing" that by accident). Pure logic, no I/O, runs under `node --test`.

`requireOperationalPermission` itself isn't unit tested — it depends on Next.js server-only APIs (cookies, redirect) the same way `lib/auth/session.ts` does, and is validated via the browser redirect-matrix testing described in the Final Report instead.
