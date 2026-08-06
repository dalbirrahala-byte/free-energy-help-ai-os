-- Production audit trail storage (Phase 6).
--
-- STATUS: tracked in version control, NOT YET APPLIED to any database.
-- Presented here for approval before being applied, per the instruction
-- that persistent audit storage requires schema approval first.
--
-- Deliberately append-only from the application's perspective: no UPDATE
-- or DELETE policy is defined for any role on this table, and Postgres
-- RLS defaults to deny anything with no matching policy — there is no way
-- for the application to alter or remove a row once written.
--
-- Login-failure events are NOT written here (see docs/AUDIT_LOGGING.md).
-- A failed login has no authenticated session, and the insert policy
-- below only allows a user to write as themselves — deliberately no
-- anon-role write path is opened for this table, since that would be a
-- new, narrow but real attack surface for a V1.0 release. Login failures
-- are logged server-side (console.warn) only, which is what "login
-- failure where safely available" in the brief anticipates.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_role text,
  action text not null check (char_length(action) > 0),
  entity_type text,
  entity_id text,
  correlation_id uuid not null,
  result text not null check (result in ('success', 'failure', 'denied')),
  metadata jsonb
);

create index if not exists audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index if not exists audit_log_actor_id_idx on public.audit_log (actor_id);
create index if not exists audit_log_action_idx on public.audit_log (action);
create index if not exists audit_log_correlation_id_idx on public.audit_log (correlation_id);

alter table public.audit_log enable row level security;

-- Only admin may read the log (matches the audit:view permission in
-- frontend/src/lib/auth/roles.ts).
create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.id = auth.uid() and ur.role = 'admin'
    )
  );

-- Any authenticated user may insert an audit row, but only attributed to
-- themselves (or anonymously, actor_id null, for the rare system-level
-- event) — never impersonating another user's actor_id.
create policy audit_log_insert_self
  on public.audit_log
  for insert
  to authenticated
  with check (actor_id = auth.uid() or actor_id is null);

-- ROLLBACK
-- drop policy if exists audit_log_insert_self on public.audit_log;
-- drop policy if exists audit_log_select_admin on public.audit_log;
-- alter table public.audit_log disable row level security;
-- drop table if exists public.audit_log;
