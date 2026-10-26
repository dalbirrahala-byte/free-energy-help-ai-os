-- Synthetic database tests only. No provider calls, emails, passwords or live identities.
-- All fixtures roll back. PostgreSQL identity sequences may advance (not rolled back).
begin;
set local statement_timeout = '45s';
set local lock_timeout = '5s';

do $$ begin
  -- 01: expected tables and RLS, including security-control tables.
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relrowsecurity) <> 26
     or exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and not c.relrowsecurity)
  then raise exception 'T01 tables/RLS'; end if;
  -- 02: no usable credential or elevated worker identity is provisioned.
  if not exists(select 1 from pg_roles where rolname='execution_dispatch_worker'
      and not rolcanlogin and not rolbypassrls and not rolsuper)
     or not exists(select 1 from pg_authid where rolname='external_lead_ingestor'
      and rolpassword is null and not rolbypassrls and not rolsuper)
  then raise exception 'T02 dormant roles'; end if;
  -- 03: external intake belongs only to the dedicated ingestor (and owner).
  if has_function_privilege('anon', 'public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text)', 'execute')
     or not has_function_privilege('external_lead_ingestor', 'public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text)', 'execute')
  then raise exception 'T03 intake grants'; end if;
  -- 04: ordinary roles/service_role cannot prepare execution dispatch.
  if has_function_privilege('anon','public.prepare_execution_dispatch(bigint,bigint)','execute')
     or has_function_privilege('authenticated','public.prepare_execution_dispatch(bigint,bigint)','execute')
     or has_function_privilege('service_role','public.prepare_execution_dispatch(bigint,bigint)','execute')
     or not has_function_privilege('execution_dispatch_worker','public.prepare_execution_dispatch(bigint,bigint)','execute')
  then raise exception 'T04 dispatch grants'; end if;
end $$;

set local role external_lead_ingestor;
do $$ declare a record; d record; begin
  -- 05: synthetic Meta-shaped DB input accepted, without calling Meta.
  select * into strict a from public.ingest_external_lead(
    'meta','feh-synthetic-61-baseline','2026-10-26T00:00:00Z','unknown',
    'FEH Synthetic Company','Synthetic Person',null,'feh-staging@example.invalid','synthetic-only');
  if a.outcome is distinct from 'accepted' or a.lead_id is null then raise exception 'T05 accepted'; end if;
  perform set_config('feh.synthetic_lead_id',a.lead_id::text,true);
  -- 06: duplicate ID returns the same CRM row.
  select * into strict d from public.ingest_external_lead(
    'meta','feh-synthetic-61-baseline','2026-10-26T00:00:00Z','unknown',
    'FEH Synthetic Company','Synthetic Person',null,'feh-staging@example.invalid','synthetic-only');
  if d.outcome is distinct from 'duplicate' or d.lead_id is distinct from a.lead_id then raise exception 'T06 dedup'; end if;
  -- 07: conflicting duplicate is not a second lead.
  select * into strict d from public.ingest_external_lead(
    'meta','feh-synthetic-61-baseline',null,'unknown','Must Not Replace',null,null,'changed@example.invalid',null);
  if d.outcome is distinct from 'duplicate' or d.lead_id is distinct from a.lead_id then raise exception 'T07 conflicting duplicate'; end if;
  -- 08: invalid provider rejected.
  select * into strict d from public.ingest_external_lead('invalid','synthetic-rejected',null,'unknown',null,null,null,'test@example.invalid',null);
  if d.outcome is distinct from 'rejected' or d.reason is distinct from 'invalid_provider' then raise exception 'T08 provider rejection'; end if;
  -- 09: invalid consent rejected.
  select * into strict d from public.ingest_external_lead('meta','synthetic-rejected',null,'invalid',null,null,null,'test@example.invalid',null);
  if d.outcome is distinct from 'rejected' or d.reason is distinct from 'invalid_consent_status' then raise exception 'T09 consent rejection'; end if;
end $$;
reset role;
do $$ begin
  -- 10: stored data not overwritten, consent unknown remains false.
  if (select count(*) from public.leads) <> 1 or not exists(select 1 from public.leads
    where id=current_setting('feh.synthetic_lead_id')::bigint and company_name='FEH Synthetic Company'
      and consent_status='unknown' and consent_given=false and lead_source='meta_ads'
      and provider_created_at='2026-10-26T00:00:00Z' and utm_campaign='synthetic-only')
  then raise exception 'T10 persisted lead'; end if;
  -- 11: accepted, duplicate and rejection audit events recorded atomically.
  if (select count(*) from public.audit_log where action='external_lead_accepted') <> 1
     or (select count(*) from public.audit_log where action='external_lead_duplicate') <> 2
     or (select count(*) from public.audit_log where action='external_lead_rejected') <> 2
     or not exists(select 1 from public.audit_log where action='external_lead_duplicate' and metadata->>'data_differs'='true')
  then raise exception 'T11 audit events'; end if;
  -- 12: no raw contact details in these audit metadata fields.
  if exists(select 1 from public.audit_log where metadata::text like '%@example.invalid%'
     or metadata::text like '%Synthetic Person%' or metadata::text like '%Synthetic Company%')
  then raise exception 'T12 audit minimisation'; end if;
end $$;

set local role anon;
do $$ begin
  -- 13: anonymous direct table reads expose no leads.
  if (select count(*) from public.leads) <> 0 then raise exception 'T13 anonymous read'; end if;
  -- 14: anonymous direct inserts are rejected.
  begin
    insert into public.leads(company_name) values ('Forbidden synthetic anon');
    raise exception 'T14 anonymous write accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000061',true);
set local role authenticated;
do $$ begin
  -- 15: unassigned authenticated identity cannot write.
  if public.user_can_write() is distinct from false then raise exception 'T15 unassigned role'; end if;
  begin
    insert into public.leads(company_name) values ('Forbidden synthetic unassigned');
    raise exception 'T15 unassigned write accepted';
  exception when insufficient_privilege then null;
  end;
  -- 16: existing ADR-008 deliberately allows organisation-wide authenticated SELECT.
  -- This asserts baseline behaviour, NOT tenant/organisation isolation.
  if (select count(*) from public.leads) <> 1 then raise exception 'T16 baseline staff read'; end if;
end $$;
reset role;

-- A synthetic Auth identity is inserted only inside this rollback transaction.
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000061');
insert into public.user_roles(id,role) values ('00000000-0000-4000-8000-000000000061','consultant');
set local role authenticated;
do $$ declare n integer; begin
  -- 17: assigned staff can write using existing RLS and sees its own role.
  if public.user_can_write() is distinct from true or (select count(*) from public.user_roles) <> 1
  then raise exception 'T17 consultant role'; end if;
  update public.leads set status='Contacted',lead_owner='synthetic-owner',
      next_action='Synthetic callback',follow_up_required=true,follow_up_date=current_date
    where id=current_setting('feh.synthetic_lead_id')::bigint;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T17 consultant write'; end if;
  -- 18: callback task and action history can be persisted and read.
  insert into public.tasks(lead_id,title,due_date,status) values
    (current_setting('feh.synthetic_lead_id')::bigint,'Synthetic callback',current_date,'Open');
  insert into public.activities(lead_id,activity_type,title) values
    (current_setting('feh.synthetic_lead_id')::bigint,'note','Synthetic action history');
  if (select count(*) from public.tasks) <> 1 or (select count(*) from public.activities) <> 1
     or not exists(select 1 from public.leads where lead_owner='synthetic-owner' and status='Contacted'
       and follow_up_required and follow_up_date=current_date)
  then raise exception 'T18 callback/history'; end if;
end $$;
reset role;

set local role execution_dispatch_worker;
do $$ begin
  -- 19: missing authorization fails closed and cannot create a dispatch.
  if public.prepare_execution_dispatch(-1,-1) is distinct from 'blocked' then raise exception 'T19 dispatch fail-closed'; end if;
end $$;
reset role;

set local role anon;
do $$ declare a jsonb; d jsonb; begin
  -- 20: existing Health Check intake creates and deduplicates synthetic enquiries.
  a := public.ingest_health_check_lead(
    p_company_name=>'FEH Synthetic Health Check',p_contact_name=>'Synthetic Person',
    p_telephone=>'07700900001',p_email=>'healthcheck@example.invalid',
    p_lead_source=>'website',p_consent_given=>true,p_energy_supply=>'both',p_enquiry_reason=>'renewal');
  d := public.ingest_health_check_lead(
    p_company_name=>'FEH Synthetic Health Check',p_contact_name=>'Synthetic Person',
    p_telephone=>'07700900001',p_email=>'healthcheck@example.invalid',
    p_lead_source=>'website',p_consent_given=>true,p_energy_supply=>'both',p_enquiry_reason=>'renewal');
  if a->>'disposition' is distinct from 'created' or d->>'disposition' is distinct from 'duplicate_suppressed'
     or a->>'lead_id' is null or a->>'lead_id' is distinct from d->>'lead_id'
  then raise exception 'T20 Health Check'; end if;
end $$;
reset role;
rollback;
select 'passed'::text as synthetic_tests, 20 as assertions;
