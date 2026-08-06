# Audit Logging — Free Energy Help AI Sales OS

## Status: service layer built and wired in; storage migration written, tracked, **not applied**

`supabase/migrations/20260805100200_audit_log.sql` creates `public.audit_log`, presented here for approval before being applied — persistent audit storage was explicitly called out as needing schema approval first, separate from the RLS migrations.

## Design

`frontend/src/lib/audit/log.ts` splits cleanly into:

- **`buildAuditEvent(input)`** — pure, no I/O, fully unit tested (9 tests). Generates the event id, timestamp, and correlation id if the caller doesn't supply one.
- **`recordAuditEvent(supabase, event)`** — persists the event. **Never throws** — a failed insert (table not migrated yet, transient DB error) is logged server-side via `console.warn` and swallowed, because an audit-logging failure must never block the underlying business action. Creating a lead must still succeed even if its audit row can't be written. This mirrors the same graceful-fallback pattern already used by `lib/auth/session.ts`'s role lookup.

Every event carries: event ID, timestamp, actor ID, actor role, action, entity type, entity ID, correlation ID, result (`success`/`failure`/`denied`), and small typed metadata. Never a password, token, API key, or full secret value — every call site in this codebase passes only IDs, role names, and small labelled fields, never a raw request body.

## Events implemented today

| Event | Where |
|---|---|
| `login_success` | `app/login/actions.ts` — `signIn` |
| `login_failure` | `app/login/actions.ts` — logged server-side only, **not persisted** (see below) |
| `logout` | `app/login/actions.ts` — `signOut` |
| `lead_created` | `app/leads/new/page.tsx` |
| `lead_updated` / `lead_status_changed` | `app/leads/[id]/edit/page.tsx` — automatically classified by comparing the pre-edit and post-edit status |
| `task_created` / `task_completed` | `app/tasks/new/page.tsx` — classified by the status selected at creation (tasks have no separate "mark complete" action yet — see gaps below) |
| `activity_recorded` | `app/leads/[id]/activity/new/page.tsx` |
| `permission_denied` | `lib/auth/enforceWrite.ts` — fires automatically whenever `requirePermission` rejects a role, before the typed error propagates |

## Why login failures are never persisted

A failed login has no authenticated session — there is no `auth.uid()` to attribute the row to. The `audit_log` insert policy deliberately only allows a user to write a row as themselves (`actor_id = auth.uid()`); opening an `anon`-role INSERT path just for this one event would add a new, narrow but real write surface to an otherwise fully-locked-down table, for a V1.0 release. `console.warn` server-side logging (with only the email domain, never the full address or password) is what "login failure where safely available" in the brief anticipates — this is the safely-available form.

## Known gaps — stated precisely, not silently expanded around

- **`contract_status_changed`, `renewal_status_changed`**: the event type exists in `AuditAction`, but **no real contract or renewal mutation exists anywhere in the app to hook it into** — `/contracts` and `/renewals` are both demo-data pages (confirmed during Phase 7). Wiring these is blocked on those modules becoming real, not on the audit layer.
- **`admin_change`**: the event type exists, but there is no admin UI in Version 1.0 (role grants happen directly via SQL — see [AUTHENTICATION.md](./AUTHENTICATION.md)). Emitting this event requires that UI to exist first.
- **Customer creation/update, activity deletion**: not in the Phase 6 minimum event list, and not wired — a straightforward addition once prioritised, using the exact same `requireOperationalPermission` + `recordAuditEvent` pattern as every other call site.

## Reading the log

Only `admin` may `SELECT` from `audit_log` (matches `audit:view` in [AUTHORISATION_AND_RBAC.md](./AUTHORISATION_AND_RBAC.md)). No UPDATE or DELETE policy exists for any role — Postgres RLS defaults to deny anything with no matching policy, making the table append-only from the application's perspective. No UI has been built to browse it yet (Post-Launch); until then, an admin reads it directly via the Supabase SQL editor.

## Testing

`frontend/src/lib/audit/log.test.ts` — 9 tests: event construction (id/correlation-id generation, entity-id stringification, null-handling), and that `recordAuditEvent` never throws even when the insert fails or the client itself throws. `recordAuditEvent`'s actual database write isn't integration-tested here, since the migration hasn't been applied yet — see [SUPABASE_RLS.md](./SUPABASE_RLS.md)'s manual checklist, which includes an audit-log-specific row.
