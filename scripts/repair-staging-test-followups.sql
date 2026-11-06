-- Owner-approved repair for issue 118, staging vredwhyphrhsudggrsen ONLY.
-- Approval: Dalbir's 2026-11-02 request 14aaea14-6e62-42d6-a65e-271cf87f5578.
-- Run through the explicitly selected staging project; this file is not a migration.
-- Exact known test identities; no broad provider backfill, owner/date/consent changes,
-- task creation, authorization or SMS. A changed record aborts the whole repair.
begin;
set local lock_timeout='3s';
set local statement_timeout='10s';
do $$
declare
  v_keys text[] := array[
    'google_ads:feh_owner_test_e3dcd841-8172-44b4-9a22-db00dcba2688',
    'google_ads:feh_google_receiver_20261101_1824',
    'google_ads:TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ-abcdefghijklmnopqrstuvwxyz-0123456789-AaBbCcDdEeFfGgHhIiJjKkLl',
    'meta:meta_dashboard_1121337167194437_444444444444',
    'meta:1781907386353507'
  ];
  v_action text := 'Review enquiry, verify contact permission and assign follow-up';
  v_before jsonb;
  v_after jsonb;
  v_id bigint;
  v_count integer;
begin
  if (select event_type from public.execution_control_events order by id desc limit 1) is distinct from 'STOP'
    or exists(select 1 from public.execution_authorisers where revoked_at is null)
    or exists(select 1 from public.execution_provider_adapters where status='approved') then
    raise exception 'Staging sending controls are not closed';
  end if;
  perform id from public.leads where provider||':'||external_lead_id=any(v_keys) order by id for update;
  get diagnostics v_count=row_count;
  if v_count<>5 then raise exception 'Expected five exact staging test leads'; end if;
  if exists(select 1 from public.leads where provider||':'||external_lead_id=any(v_keys) and
    (status is distinct from 'New' or lead_owner is not null or follow_up_date is not null or
     not ((next_action is null and follow_up_required is null) or
          (next_action is not distinct from v_action and follow_up_required is true)))) then
    raise exception 'Staging test follow-up state changed; review required';
  end if;
  select jsonb_agg(to_jsonb(l)-'next_action'-'follow_up_required' order by id) into v_before
    from public.leads l where provider||':'||external_lead_id=any(v_keys);
  for v_id in
    update public.leads set next_action=v_action,follow_up_required=true
      where provider||':'||external_lead_id=any(v_keys) and next_action is null and follow_up_required is null
      returning id
  loop
    insert into public.audit_log(action,actor_id,actor_role,entity_type,entity_id,correlation_id,result,metadata)
    values('lead_follow_up_initialized',null,null,'lead',v_id::text,gen_random_uuid(),'success',
      jsonb_build_object('approval_reference','owner-request-20261102-14aaea14-6e62-42d6-a65e-271cf87f5578',
        'reason','issue_118_staging_test_repair','execution_allowed',false));
  end loop;
  select jsonb_agg(to_jsonb(l)-'next_action'-'follow_up_required' order by id) into v_after
    from public.leads l where provider||':'||external_lead_id=any(v_keys);
  if v_before is distinct from v_after then raise exception 'Repair changed unrelated lead data'; end if;
end;
$$;
commit;
