-- Read-only, bounded candidate discovery for the existing dedicated worker.
-- This grants neither approval nor contact permission and never claims a row.
-- SECURITY DEFINER matches the established worker RPC boundary: raw tables
-- remain inaccessible, and only execution_dispatch_worker gets EXECUTE.
-- All authority is rechecked under locks by claim_meta_lead_acknowledgement;
-- overlapping selectors may see the same candidate but cannot claim it twice.
create function public.select_lead_acknowledgement_candidate(p_allowed_phone text)
returns table(lead_id bigint, authorization_id bigint, provider_adapter_id bigint)
language sql volatile security definer set search_path = '' as $$
  select q.lead_id, a.id, adapter.id
  from public.lead_acknowledgements q
  join public.leads l on l.id = q.lead_id
    and l.provider = q.provider and l.external_lead_id = q.external_lead_id
    and l.provider_created_at = q.provider_created_at
    and l.lead_source = case q.provider when 'meta' then 'meta_ads' when 'google_ads' then 'google_ads' end
  join public.execution_authorizations a
    on a.action_id = q.provider || ':feh-callback-ack-v1:' || q.external_lead_id
    and a.organisation_id = l.organisation_id
    and a.requested_channel = 'SMS' and a.authorization_status = 'authorised'
    and a.consumed_at is null and a.execution_performed = false
    and a.expires_at > pg_catalog.statement_timestamp()
  join public.execution_intents i on i.id = a.execution_intent_id
    and i.action_id = a.action_id and i.contact_id = a.contact_id
    and i.organisation_id = a.organisation_id and i.requested_channel = 'SMS'
  join public.contacts c on c.id = a.contact_id and c.organisation_id = a.organisation_id
    and pg_catalog.btrim(c.phone) = p_allowed_phone
  join lateral (
    select e.id, e.decision, e.reason, e.evidence_reference
    from public.execution_intent_approvals e where e.execution_intent_id = i.id
    order by e.id desc limit 1
  ) approval on approval.id = a.approval_decision_id and approval.decision = 'approved'
    and approval.reason = 'feh-callback-ack-v1'
    and nullif(pg_catalog.btrim(approval.evidence_reference), '') is not null
  join public.execution_authorisers g on g.id = a.execution_authoriser_grant_id
    and g.user_id = a.actor_id and g.capability = 'execution_authoriser' and g.revoked_at is null
  join public.compliance_decisions cd on cd.id = a.compliance_decision_id
    and cd.execution_intent_id = i.id and cd.contact_id = c.id and cd.organisation_id = a.organisation_id
    and cd.requested_channel = 'SMS' and cd.decision = 'eligible'
    and cd.policy_version = 'FEH_CONTACT_PERMISSION_V1' and cd.expires_at > pg_catalog.statement_timestamp()
  join public.execution_provider_adapters adapter on adapter.channel = 'SMS'
    and adapter.adapter_key = 'TELNYX_FEH_CALLBACK_ACK_V1' and adapter.status = 'approved'
    and adapter.approved_by is not null and adapter.approved_at is not null
  cross join lateral (select pg_catalog.regexp_replace(pg_catalog.btrim(l.telephone), '[ ()-]', '', 'g') as phone) normalized
  where p_allowed_phone ~ '^\+447[1-57-9][0-9]{8}$'
    and q.status = 'awaiting_authority' and q.template_version = 'feh-callback-ack-v1'
    and q.provider in ('meta','google_ads')
    and q.provider_created_at >= pg_catalog.statement_timestamp() - interval '24 hours'
    and q.provider_created_at <= pg_catalog.statement_timestamp() + interval '5 minutes'
    and (case when normalized.phone ~ '^07[1-57-9][0-9]{8}$' then '+44' || pg_catalog.substr(normalized.phone, 2)
              when normalized.phone ~ '^00447[1-57-9][0-9]{8}$' then '+' || pg_catalog.substr(normalized.phone, 3)
              else normalized.phone end) = p_allowed_phone
    and public.verify_destination_commitment(c.id, 'SMS', cd.destination_commitment_nonce, cd.destination_commitment) = 'verified'
    and public.evaluate_suppression_live(i.id) = 'clear'
    and public.evaluate_execution_emergency_stop() = 'clear'
  order by q.received_at, q.lead_id, a.id
  limit 1;
$$;
revoke all on function public.select_lead_acknowledgement_candidate(text)
  from public, anon, authenticated, service_role, external_lead_ingestor,
    feh_ack_preview_ingestor, feh_ack_preview_worker;
grant execute on function public.select_lead_acknowledgement_candidate(text) to execution_dispatch_worker;
comment on function public.select_lead_acknowledgement_candidate(text) is
  'Read-only selection of at most one pre-approved acknowledgement. No claim, grant, retry, or provider call.';
