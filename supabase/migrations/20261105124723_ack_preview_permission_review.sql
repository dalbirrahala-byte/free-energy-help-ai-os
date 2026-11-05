-- Owner review of wording and fictional permission fixtures only.
-- No execution grant, compliance decision, lead, queue entry or provider call.
-- Uses the existing staging owner binding solely for identity, never its consumed
-- test authority. An AAL2 owner can review without receiving an administrator role.
create schema feh_ack_review_private;
revoke all on schema feh_ack_review_private from public, anon, authenticated, service_role;

create table feh_ack_review_private.rule_reviews (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  proposal_version text not null,
  proposal jsonb not null,
  approved_at timestamptz not null default pg_catalog.statement_timestamp(),
  scope text not null default 'fictional_staging_test_only' check (scope='fictional_staging_test_only'),
  unique(owner_id, proposal_version)
);
create table feh_ack_review_private.permission_fixtures (
  test_id uuid primary key,
  review_id bigint not null references feh_ack_review_private.rule_reviews(id) on delete restrict,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  source text not null check (source in ('meta','google')),
  permission text not null check (permission in ('yes','no','not_sure')),
  recorded_at timestamptz not null default pg_catalog.statement_timestamp(),
  evidence_kind text not null default 'synthetic_fixture' check (evidence_kind='synthetic_fixture')
);
create index ack_permission_fixtures_review_idx on feh_ack_review_private.permission_fixtures(review_id, recorded_at);
create index ack_permission_fixtures_actor_idx on feh_ack_review_private.permission_fixtures(recorded_by);
alter table feh_ack_review_private.rule_reviews enable row level security;
alter table feh_ack_review_private.permission_fixtures enable row level security;
revoke all on all tables in schema feh_ack_review_private from public, anon, authenticated, service_role;
revoke all on all sequences in schema feh_ack_review_private from public, anon, authenticated, service_role;

create function feh_ack_review_private.proposal()
returns jsonb language sql immutable set search_path='' as $$
select '{"version": "feh-ack-permission-review-v1", "scope": "fictional_staging_test_only", "notice": "Please contact me about my business energy enquiry. Free Energy Help may call me and send one SMS acknowledging this enquiry. I can reply STOP to stop automated texts.", "message": "Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.", "rules": ["One acknowledgement for each fresh eligible enquiry from a verified FEH Meta, Instagram or Google form.", "Record the form and notice version, the submitted answer and time, and the provider enquiry identity.", "Hold enquiries with missing, refused, uncertain or conflicting permission for human review.", "Check customer opt-outs and the global sending stop before sending.", "Keep one durable attempt. Repeated events and uncertain provider results must never trigger a blind resend.", "Record enquiry contact permission separately from marketing permission."]}'::jsonb;
$$;
create function feh_ack_review_private.owner_verified()
returns boolean language sql stable security definer set search_path='' as $$
select coalesce(public.ack_preview_owner_identity()
  and auth.jwt()->>'aal'='aal2'
  and coalesce(auth.jwt()->>'is_anonymous','false')='false',false);
$$;
revoke all on all functions in schema feh_ack_review_private from public, anon, authenticated, service_role;

create function public.get_ack_permission_review()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_proposal jsonb:=feh_ack_review_private.proposal(); v_review feh_ack_review_private.rule_reviews%rowtype;
begin
  if not feh_ack_review_private.owner_verified() then return '{"status":"blocked"}'::jsonb; end if;
  select * into v_review from feh_ack_review_private.rule_reviews
    where owner_id=auth.uid() and proposal_version=v_proposal->>'version';
  if found and v_review.proposal is distinct from v_proposal then return '{"status":"blocked"}'::jsonb; end if;
  return pg_catalog.jsonb_build_object('status','ready','proposal',v_proposal,'approved_at',v_review.approved_at,
    'records',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'test_id',f.test_id,'source',f.source,'permission',f.permission,'recorded_at',f.recorded_at) order by f.recorded_at desc)
      from (select * from feh_ack_review_private.permission_fixtures
        where review_id=v_review.id and recorded_by=auth.uid() order by recorded_at desc limit 20) f),'[]'::jsonb));
end;
$$;

create function public.approve_ack_permission_review(p_version text)
returns text language plpgsql volatile security definer set search_path='' as $$
declare v_proposal jsonb:=feh_ack_review_private.proposal(); v_review bigint;
begin
  if not feh_ack_review_private.owner_verified() or p_version is distinct from v_proposal->>'version'
    then return 'blocked'; end if;
  insert into feh_ack_review_private.rule_reviews(owner_id,proposal_version,proposal)
    values(auth.uid(),p_version,v_proposal) on conflict(owner_id,proposal_version) do nothing returning id into v_review;
  if v_review is not null then
    insert into public.audit_log(actor_id,actor_role,action,entity_type,entity_id,correlation_id,result,metadata)
      values(auth.uid(),(select role from public.user_roles where id=auth.uid()),'ack_mock_rule_reviewed',
        'ack_mock_rule_review',v_review::text,pg_catalog.gen_random_uuid(),'success',
        pg_catalog.jsonb_build_object('version',p_version,'scope','fictional_staging_test_only','execution_allowed',false));
  end if;
  if not exists(select 1 from feh_ack_review_private.rule_reviews
    where owner_id=auth.uid() and proposal_version=p_version and proposal=v_proposal) then return 'blocked'; end if;
  return 'approved_for_mock';
end;
$$;

create function public.record_ack_mock_permission(p_version text,p_test_id uuid,p_source text,p_permission text)
returns text language plpgsql volatile security definer set search_path='' as $$
declare v_proposal jsonb:=feh_ack_review_private.proposal(); v_review bigint; v_inserted uuid;
begin
  if not feh_ack_review_private.owner_verified() or p_version is distinct from v_proposal->>'version'
    or p_test_id is null or p_test_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_source is null or p_source not in ('meta','google')
    or p_permission is null or p_permission not in ('yes','no','not_sure') then return 'blocked'; end if;
  select id into v_review from feh_ack_review_private.rule_reviews
    where owner_id=auth.uid() and proposal_version=p_version and proposal=v_proposal;
  if v_review is null then return 'blocked'; end if;
  insert into feh_ack_review_private.permission_fixtures(test_id,review_id,recorded_by,source,permission)
    values(p_test_id,v_review,auth.uid(),p_source,p_permission) on conflict(test_id) do nothing returning test_id into v_inserted;
  if v_inserted is null then
    if exists(select 1 from feh_ack_review_private.permission_fixtures where test_id=p_test_id
      and review_id=v_review and recorded_by=auth.uid() and source=p_source and permission=p_permission)
      then return 'duplicate'; end if;
    return 'blocked';
  end if;
  insert into public.audit_log(actor_id,actor_role,action,entity_type,entity_id,correlation_id,result,metadata)
    values(auth.uid(),(select role from public.user_roles where id=auth.uid()),'ack_mock_permission_recorded',
      'ack_mock_permission',p_test_id::text,p_test_id,'success',pg_catalog.jsonb_build_object(
        'version',p_version,'source',p_source,'permission',p_permission,'evidence_kind','synthetic_fixture','execution_allowed',false));
  return 'saved';
end;
$$;

revoke all on function public.get_ack_permission_review(),public.approve_ack_permission_review(text),
  public.record_ack_mock_permission(text,uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.get_ack_permission_review(),public.approve_ack_permission_review(text),
  public.record_ack_mock_permission(text,uuid,text,text) to authenticated;
