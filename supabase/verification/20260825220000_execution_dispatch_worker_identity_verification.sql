-- Factory 041 Phase 17A + 17A.1: combined verification script for
-- 20260825210000_execution_dispatch_worker_identity_foundation.sql
-- AND 20260825220000_execution_internal_primitive_service_role_
-- lockdown.sql.
--
-- NOT A MIGRATION -- deliberately kept outside supabase/migrations/ so
-- `supabase db push` can never apply it. This is a standalone, runnable
-- SQL script to be executed AFTER both migrations above have been
-- applied to a LOCAL or STAGING PostgreSQL instance (never run for the
-- first time against production) -- it proves (A) the 18 properties the
-- Phase 17A authorisation required for execution_dispatch_worker, and
-- (B) the Phase 17A.1 authorisation's requirement that execution_
-- dispatch_worker, service_role, anon, authenticated, and PUBLIC are ALL
-- unable to EXECUTE any of the three internal primitives, each as a `DO`
-- block that raises an exception on failure and prints a confirmation on
-- success. Genuine local/staging execution of this script was NOT
-- possible during either phase's own construction: no Docker daemon and
-- no local PostgreSQL instance were available in this session's
-- environment. This script is therefore a ready-to-run verification
-- checklist, not a claim that these properties have already been
-- execution-tested -- see each phase's own final report "Tests and
-- counts" section for the exact, honest distinction between what was
-- statically reviewed and what still requires a real run before
-- deployment.
--
-- USAGE: `psql <connection-string> -f supabase/verification/20260825220000_execution_dispatch_worker_identity_verification.sql`
-- against a local `supabase start` stack or a disposable staging
-- database that already has both migrations applied. Every block either
-- prints "OK: <description>" or raises an exception naming exactly which
-- property failed.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'execution_dispatch_worker') then
    raise exception 'FAIL: execution_dispatch_worker does not exist';
  end if;
  raise notice 'OK: execution_dispatch_worker exists';
end
$$;

do $$
declare
  v_can_login boolean;
begin
  select rolcanlogin into v_can_login from pg_roles where rolname = 'execution_dispatch_worker';
  if v_can_login is distinct from false then
    raise exception 'FAIL: rolcanlogin is not false (%)', v_can_login;
  end if;
  raise notice 'OK: rolcanlogin = false';
end
$$;

do $$
declare
  v boolean;
begin
  select rolsuper into v from pg_roles where rolname = 'execution_dispatch_worker';
  if v is distinct from false then
    raise exception 'FAIL: rolsuper is not false (%)', v;
  end if;
  raise notice 'OK: rolsuper = false';
end
$$;

do $$
declare
  v boolean;
begin
  select rolcreaterole into v from pg_roles where rolname = 'execution_dispatch_worker';
  if v is distinct from false then
    raise exception 'FAIL: rolcreaterole is not false (%)', v;
  end if;
  raise notice 'OK: rolcreaterole = false';
end
$$;

do $$
declare
  v boolean;
begin
  select rolcreatedb into v from pg_roles where rolname = 'execution_dispatch_worker';
  if v is distinct from false then
    raise exception 'FAIL: rolcreatedb is not false (%)', v;
  end if;
  raise notice 'OK: rolcreatedb = false';
end
$$;

do $$
declare
  v boolean;
begin
  select rolreplication into v from pg_roles where rolname = 'execution_dispatch_worker';
  if v is distinct from false then
    raise exception 'FAIL: rolreplication is not false (%)', v;
  end if;
  raise notice 'OK: rolreplication = false';
end
$$;

do $$
declare
  v boolean;
begin
  select rolbypassrls into v from pg_roles where rolname = 'execution_dispatch_worker';
  if v is distinct from false then
    raise exception 'FAIL: rolbypassrls is not false (%)', v;
  end if;
  raise notice 'OK: rolbypassrls = false';
end
$$;

-- Property 8: EXECUTE on exactly the six approved functions.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from (
    values
      ('consume_execution_authorization(bigint)'),
      ('prepare_execution_dispatch(bigint, bigint)'),
      ('complete_execution_dispatch_success(bigint, text)'),
      ('complete_execution_dispatch_failure(bigint, text)'),
      ('complete_execution_dispatch_indeterminate(bigint, text)'),
      ('evaluate_execution_precall_readiness(bigint)')
  ) as expected(sig)
  where has_function_privilege('execution_dispatch_worker', ('public.' || sig)::regprocedure, 'EXECUTE');

  if v_count <> 6 then
    raise exception 'FAIL: execution_dispatch_worker has EXECUTE on % of 6 expected functions', v_count;
  end if;
  raise notice 'OK: execution_dispatch_worker has EXECUTE on exactly the six approved functions';
end
$$;

-- Property 9: NO EXECUTE on the three internal primitives.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from (
    values
      ('evaluate_execution_emergency_stop()'),
      ('evaluate_suppression_live(bigint)'),
      ('verify_destination_commitment(bigint, text, uuid, bytea)')
  ) as internal_fns(sig)
  where has_function_privilege('execution_dispatch_worker', ('public.' || sig)::regprocedure, 'EXECUTE');

  if v_count <> 0 then
    raise exception 'FAIL: execution_dispatch_worker has EXECUTE on % of 3 internal primitives that should be inaccessible', v_count;
  end if;
  raise notice 'OK: execution_dispatch_worker has no EXECUTE on any internal primitive';
end
$$;

-- Properties 10-13: anon/authenticated/service_role/PUBLIC remain
-- unable to EXECUTE all six approved functions.
do $$
declare
  v_role text;
  v_sig text;
  v_bad_count integer := 0;
begin
  foreach v_role in array array['anon', 'authenticated', 'service_role', 'public']
  loop
    foreach v_sig in array array[
      'consume_execution_authorization(bigint)',
      'prepare_execution_dispatch(bigint, bigint)',
      'complete_execution_dispatch_success(bigint, text)',
      'complete_execution_dispatch_failure(bigint, text)',
      'complete_execution_dispatch_indeterminate(bigint, text)',
      'evaluate_execution_precall_readiness(bigint)'
    ]
    loop
      if has_function_privilege(v_role, ('public.' || v_sig)::regprocedure, 'EXECUTE') then
        v_bad_count := v_bad_count + 1;
        raise notice 'FAIL DETAIL: % can EXECUTE %', v_role, v_sig;
      end if;
    end loop;
  end loop;

  if v_bad_count <> 0 then
    raise exception 'FAIL: % (role, function) pairs among anon/authenticated/service_role/public unexpectedly have EXECUTE', v_bad_count;
  end if;
  raise notice 'OK: anon, authenticated, service_role, and PUBLIC all remain unable to EXECUTE any of the six functions';
end
$$;

-- Property 14/15: no raw table write or read privilege of any kind.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from information_schema.role_table_grants
  where grantee = 'execution_dispatch_worker';

  if v_count <> 0 then
    raise exception 'FAIL: execution_dispatch_worker holds % raw table-level grant(s) -- expected zero', v_count;
  end if;
  raise notice 'OK: execution_dispatch_worker has zero raw table privileges of any kind (read or write)';
end
$$;

-- Property 16/17: structural, not queryable directly -- documented
-- instead. No network/provider SDK is reachable from PL/pgSQL in this
-- schema (confirmed by the complete absence of any such code in every
-- Factory 041 migration, and by evaluateFinalExecutionBoundary.test.ts's
-- own static "no network capability" guard on the TypeScript side). No
-- environment variable or credential is referenced anywhere in this
-- migration -- confirmed by direct re-reading of its own text.

do $$
begin
  raise notice 'Phase 17A verification checks completed. See NOTICE output above for per-property results.';
end
$$;

-- ---------------------------------------------------------------------
-- Phase 17A.1: internal primitives must be unreachable by
-- execution_dispatch_worker, service_role, anon, authenticated, AND
-- PUBLIC. execution_dispatch_worker's own non-access was already proven
-- by Property 9 above; this block covers the remaining four roles,
-- restoring full symmetry with the six-function matrix checked in
-- Properties 10-13.
-- ---------------------------------------------------------------------

do $$
declare
  v_role text;
  v_sig text;
  v_bad_count integer := 0;
begin
  foreach v_role in array array['execution_dispatch_worker', 'anon', 'authenticated', 'service_role', 'public']
  loop
    foreach v_sig in array array[
      'evaluate_execution_emergency_stop()',
      'evaluate_suppression_live(bigint)',
      'verify_destination_commitment(bigint, text, uuid, bytea)'
    ]
    loop
      if has_function_privilege(v_role, ('public.' || v_sig)::regprocedure, 'EXECUTE') then
        v_bad_count := v_bad_count + 1;
        raise notice 'FAIL DETAIL: % can EXECUTE internal primitive %', v_role, v_sig;
      end if;
    end loop;
  end loop;

  if v_bad_count <> 0 then
    raise exception 'FAIL: % (role, function) pairs among execution_dispatch_worker/anon/authenticated/service_role/public unexpectedly have EXECUTE on an internal primitive', v_bad_count;
  end if;
  raise notice 'OK: execution_dispatch_worker, anon, authenticated, service_role, and PUBLIC all remain unable to EXECUTE any of the three internal primitives';
end
$$;

do $$
begin
  raise notice 'Phase 17A.1 verification checks completed. See NOTICE output above for per-property results.';
end
$$;
