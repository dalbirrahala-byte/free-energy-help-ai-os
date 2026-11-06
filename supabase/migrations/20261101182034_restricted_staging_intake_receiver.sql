-- Staging only: vredwhyphrhsudggrsen. Synthetic provider intake, never SMS.
-- Pre-state: existing reviewed ingest_external_lead RPC; receiver role absent.
-- Password and LOGIN provisioning are separate private operations.
do $$ begin
  if exists(select 1 from pg_roles where rolname='feh_intake_preview_receiver') then
    raise exception 'Receiver identity exists; inspect before provisioning';
  end if;
  if to_regprocedure('public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text)') is null then
    raise exception 'Expected intake primitive missing';
  end if;
end $$;
create role feh_intake_preview_receiver nologin noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls connection limit 2 password null
  valid until '2026-11-06T23:59:59Z';
grant usage on schema public to feh_intake_preview_receiver;
grant execute on function public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text)
  to feh_intake_preview_receiver;
alter role feh_intake_preview_receiver set statement_timeout='10s';
alter role feh_intake_preview_receiver set lock_timeout='3s';
alter role feh_intake_preview_receiver set idle_in_transaction_session_timeout='15s';
alter role feh_intake_preview_receiver set search_path='pg_catalog';
-- No memberships, raw table privileges, queue RPCs, worker RPCs or auth grants.
-- Post-state: one dormant expiring identity; execution STOP unchanged.
-- Recovery: disable receiver flag, set role NOLOGIN, drain active sessions.
-- Preserve intake/audit records. Revoke this single function grant if retired.
