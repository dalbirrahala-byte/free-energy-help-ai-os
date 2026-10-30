-- Restricted staging runtime identities. No password or provider activation.
-- Apply only to the reviewed staging project vredwhyphrhsudggrsen.
-- The existing postgres memberships (ADMIN true, SET false) remain unchanged.
-- Password provisioning is separate and private; without it these logins
-- cannot authenticate. Never place a database password in this migration.
do $$
begin
  if exists (select 1 from pg_roles where rolname in
    ('feh_ack_preview_ingestor','feh_ack_preview_worker')) then
    raise exception 'Preview identity already exists: inspect before provisioning';
  end if;
  if not exists(select 1 from pg_roles where rolname='external_lead_ingestor')
     or not exists(select 1 from pg_roles where rolname='execution_dispatch_worker' and not rolcanlogin) then
    raise exception 'Expected restricted capability roles are missing';
  end if;
end $$;

create role feh_ack_preview_ingestor login noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls connection limit 2 password null;
create role feh_ack_preview_worker login noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls connection limit 2 password null;
grant external_lead_ingestor to feh_ack_preview_ingestor
  with admin false, inherit false, set true;
grant execution_dispatch_worker to feh_ack_preview_worker
  with admin false, inherit false, set true;
alter role feh_ack_preview_ingestor set statement_timeout='10s';
alter role feh_ack_preview_worker set statement_timeout='10s';
alter role feh_ack_preview_ingestor set lock_timeout='3s';
alter role feh_ack_preview_worker set lock_timeout='3s';
alter role feh_ack_preview_ingestor set idle_in_transaction_session_timeout='15s';
alter role feh_ack_preview_worker set idle_in_transaction_session_timeout='15s';
alter role feh_ack_preview_ingestor set search_path='pg_catalog';
alter role feh_ack_preview_worker set search_path='pg_catalog';

-- No table/function grant is added. The runtime may assume only its named
-- capability role, inside a transaction. Ingestor cannot become worker.
-- Recovery: first disable the branch's runtime flag and set both new roles
-- NOLOGIN; preserve queue/attempt history. Revoke their two memberships once
-- active sessions have drained. Do not grant either role to postgres.
