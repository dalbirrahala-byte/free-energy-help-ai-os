-- User roles: the storage layer for Version 1.0 RBAC.
--
-- STATUS: tracked in version control, NOT YET APPLIED to any database.
-- Apply only after confirming Supabase Auth is enabled on the project and
-- after reading docs/AUTHORISATION_AND_RBAC.md.
--
-- Access model (ADR-008): organisation-wide authenticated access. Every
-- role sees the same records; role only gates which *operations* are
-- permitted. The CHECK constraint below must stay in sync with
-- frontend/src/lib/auth/roles.ts's ROLES constant — that file is the
-- single source of truth for what a role can *do*; this table is only
-- where the role assignment is stored.

create table if not exists public.user_roles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'read_only'
    check (role in ('admin', 'manager', 'operations', 'consultant', 'read_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_role_idx on public.user_roles (role);

-- RLS on user_roles itself. Without this, any authenticated user could
-- read or rewrite anyone's role — including granting themselves admin —
-- which would make every other policy in the system meaningless.
alter table public.user_roles enable row level security;

-- Any authenticated user may read their own role (the app needs this to
-- decide what to show/allow) and nothing else.
create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (id = auth.uid());

-- Only an existing admin may grant, change, or revoke any role, including
-- their own. Postgres permits a policy to query the table it protects.
create policy user_roles_admin_manage
  on public.user_roles
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.id = auth.uid() and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.id = auth.uid() and ur.role = 'admin'
    )
  );

-- No policy grants the anon role anything here — RLS defaults to deny,
-- so unauthenticated requests get zero rows and cannot write.

-- Bootstrap note (read before applying; not part of the tracked schema):
-- the first admin row cannot be created through these policies, since
-- inserting one requires an existing admin row to already exist. Create
-- the Supabase Auth user first (dashboard or Auth Admin API), then insert
-- their initial admin row directly via the Supabase SQL editor
-- (service-role context, bypasses RLS):
--   insert into public.user_roles (id, role) values ('<auth.users.id>', 'admin');

-- ROLLBACK
-- drop policy if exists user_roles_admin_manage on public.user_roles;
-- drop policy if exists user_roles_select_own on public.user_roles;
-- alter table public.user_roles disable row level security;
-- drop table if exists public.user_roles;
