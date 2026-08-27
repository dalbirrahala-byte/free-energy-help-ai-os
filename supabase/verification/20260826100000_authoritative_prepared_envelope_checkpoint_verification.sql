-- Run only in an explicitly authorised local/staging verification database.
-- This script performs catalog-only assertions and does not invoke execution.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name in (
      'consume_execution_authorization', 'prepare_execution_dispatch',
      'complete_execution_dispatch_success', 'complete_execution_dispatch_failure',
      'complete_execution_dispatch_indeterminate', 'evaluate_execution_precall_readiness'
    ) and grantee = 'execution_dispatch_worker' and privilege_type = 'EXECUTE';
  if v_count <> 6 then raise exception 'expected exactly six worker EXECUTE capabilities, found %', v_count; end if;

  if exists (
    select 1 from information_schema.table_privileges
    where grantee = 'execution_dispatch_worker'
  ) then raise exception 'execution_dispatch_worker must have no table privileges'; end if;

  if exists (
    select 1 from information_schema.usage_privileges
    where grantee = 'execution_dispatch_worker'
      and object_type = 'SEQUENCE'
  ) then raise exception 'execution_dispatch_worker must have no sequence privileges'; end if;

  if exists (
    select 1 from pg_catalog.pg_roles
    where rolname = 'execution_dispatch_worker'
      and (rolcanlogin or rolsuper or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls)
  ) then raise exception 'execution_dispatch_worker must remain NOLOGIN and unprivileged'; end if;

  if exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in ('prepare_execution_dispatch', 'evaluate_execution_precall_readiness')
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
      and privilege_type = 'EXECUTE'
  ) then raise exception 'checkpoint functions exposed outside worker boundary'; end if;
end
$$;
