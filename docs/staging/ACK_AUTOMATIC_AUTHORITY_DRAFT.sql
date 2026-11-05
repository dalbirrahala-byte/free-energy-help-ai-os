-- REVIEW / LOCAL TEST CONSTRUCTION ONLY. Not a numbered migration and not
-- installed anywhere. Generate the migration with the CLI after review.
-- No rows, LOGINs, memberships, adapter approvals or execution grants seeded.
-- This is a bounded staging delegation, NOT an unlimited production rule.
create schema feh_ack_authority_private;
revoke all on schema feh_ack_authority_private from public,anon,authenticated,service_role;

-- Provision only after verifying the actual displayed form notice/question.
-- An immutable binding pins the test owner, recipient and source. No user may
-- edit it through the application. Another version requires another binding.
create table feh_ack_authority_private.bindings (
  id uuid primary key default gen_random_uuid(),
  project_ref text not null check(project_ref='vredwhyphrhsudggrsen'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  contact_id bigint not null references public.contacts(id) on delete restrict,
  allowed_phone text not null check(allowed_phone ~ '^\+447[1-57-9][0-9]{8}$' and allowed_phone<>'+447427851020'),
  provider text not null check(provider in ('meta','google_ads')),
  form_id text not null check(form_id ~ '^[0-9]{1,100}$'),
  page_id text,
  campaign_id text not null check(campaign_id ~ '^[0-9]{1,100}$'),
  question_key text not null check(length(question_key) between 1 and 200),
  affirmative_answer text not null check(length(affirmative_answer) between 1 and 200),
  negative_answer text not null check(length(negative_answer) between 1 and 200),
  notice_version text not null check(length(notice_version) between 1 and 100),
  notice_text text not null check(length(notice_text) between 1 and 2000),
  form_review_reference text not null check(length(form_review_reference) between 1 and 200),
  check(affirmative_answer<>negative_answer),
  check((provider='meta' and page_id is not null and page_id ~ '^[0-9]{1,100}$') or
    (provider='google_ads' and page_id is null))
);
create table feh_ack_authority_private.rules (
  id uuid primary key default gen_random_uuid(),
  binding_id uuid not null unique references feh_ack_authority_private.bindings(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  grant_id bigint not null references public.execution_authorisers(id) on delete restrict,
  approved_at timestamptz not null,
  expires_at timestamptz not null,
  approval_reference text not null check(length(approval_reference) between 1 and 200),
  template_version text not null check(template_version='feh-callback-ack-v2'),
  message_text text not null check(message_text='Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.'),
  check(expires_at>approved_at and expires_at<=approved_at+interval '15 minutes')
);
create table feh_ack_authority_private.permissions (
  lead_id bigint primary key references public.lead_acknowledgements(lead_id) on delete restrict,
  binding_id uuid not null references feh_ack_authority_private.bindings(id) on delete restrict,
  submitted_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  answer text not null check(answer in ('yes','no','unknown')),
  answer_hash bytea not null,
  conflicted boolean not null default false
);
create table feh_ack_authority_private.authorizations (
  lead_id bigint primary key references feh_ack_authority_private.permissions(lead_id) on delete restrict,
  -- Exactly ONE enquiry under each 15-minute staging approval. Exhaustion does
  -- not rearm on crash, expiry, failed/indeterminate result or process restart.
  rule_id uuid not null unique references feh_ack_authority_private.rules(id) on delete restrict,
  intent_id bigint not null unique references public.execution_intents(id) on delete restrict,
  authorization_id bigint not null unique references public.execution_authorizations(id) on delete restrict,
  adapter_id bigint not null references public.execution_provider_adapters(id) on delete restrict
);
alter table feh_ack_authority_private.bindings enable row level security;
alter table feh_ack_authority_private.rules enable row level security;
alter table feh_ack_authority_private.permissions enable row level security;
alter table feh_ack_authority_private.authorizations enable row level security;
revoke all on all tables in schema feh_ack_authority_private from public,anon,authenticated,service_role;

-- The real authenticated owner must review the exact notice AND message. The
-- previous fictional permission-review approval cannot satisfy this function.
-- No grant is created here; an independently granted current capability is
-- mandatory. No JWT/session is forged by the autonomous authorizer below.
create function feh_ack_authority_private.approve_rule(
  p_binding_id uuid,p_expected_notice text,p_expected_message text,p_reference text
) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare b feh_ack_authority_private.bindings%rowtype; g bigint; r uuid; t timestamptz;
begin
  if auth.uid() is null or auth.jwt()->>'iss' is distinct from 'https://vredwhyphrhsudggrsen.supabase.co/auth/v1' or
    auth.jwt()->>'aal' is distinct from 'aal2' or
    auth.jwt()->>'is_anonymous' is distinct from 'false' then return null; end if;
  select * into b from feh_ack_authority_private.bindings where id=p_binding_id for share;
  if not found or b.owner_id is distinct from auth.uid() or
    p_expected_notice is distinct from b.notice_text or p_expected_message is distinct from
      'Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.' or
    p_reference is null or length(btrim(p_reference)) not between 1 and 200 then return null; end if;
  select id into g from public.execution_authorisers where user_id=b.owner_id and
    capability='execution_authoriser' and revoked_at is null for share;
  if not found then return null; end if;
  t:=pg_catalog.clock_timestamp();
  insert into feh_ack_authority_private.rules(binding_id,owner_id,grant_id,approved_at,expires_at,
    approval_reference,template_version,message_text) values(b.id,b.owner_id,g,t,t+interval '15 minutes',
    p_reference,'feh-callback-ack-v2',p_expected_message)
    on conflict(binding_id) do nothing returning id into r;
  -- A repeated click never renews an expired or exhausted approval.
  return r;
end;
$$;

-- Called ONLY by the restricted verified-ingress boundary after provider
-- authentication and exact lead/form matching. No endpoint is wired by this
-- draft. The caller cannot supply a permission=true/approval=true shortcut.
create function feh_ack_authority_private.record_permission(
  p_binding_id uuid,p_lead_id bigint,p_submitted_at timestamptz,p_question_key text,p_answer text
) returns text language plpgsql volatile security definer set search_path='' as $$
declare b feh_ack_authority_private.bindings%rowtype; q public.lead_acknowledgements%rowtype;
  l public.leads%rowtype; prior feh_ack_authority_private.permissions%rowtype;
  answer text; answer_hash bytea; phone text;
begin
  select * into b from feh_ack_authority_private.bindings where id=p_binding_id for share;
  if not found or p_question_key is distinct from b.question_key or p_submitted_at is null or
    not pg_catalog.isfinite(p_submitted_at) or p_answer is null or length(p_answer)>200 then return 'rejected'; end if;
  -- Lead/queue before the control mutex matches the existing claim/checkpoint
  -- order. Callback STOP holds the mutex and never requests these row locks.
  select * into l from public.leads where id=p_lead_id for share;
  select * into q from public.lead_acknowledgements where lead_id=p_lead_id for update;
  if q.lead_id is null or q.provider is distinct from b.provider or q.form_id is distinct from b.form_id or
    q.page_id is distinct from b.page_id or l.utm_campaign is distinct from b.campaign_id or
    l.provider is distinct from q.provider or l.external_lead_id is distinct from q.external_lead_id or
    l.provider_created_at is distinct from q.provider_created_at or p_submitted_at is distinct from q.provider_created_at then return 'rejected'; end if;
  phone:=pg_catalog.regexp_replace(pg_catalog.btrim(l.telephone),'[ ()-]','','g');
  if phone ~ '^07' then phone:='+44'||pg_catalog.substr(phone,2);
  elsif phone ~ '^00447' then phone:='+'||pg_catalog.substr(phone,3); end if;
  if phone is distinct from b.allowed_phone then return 'rejected'; end if;
  answer:=case when p_answer=b.affirmative_answer then 'yes' when p_answer=b.negative_answer then 'no' else 'unknown' end;
  answer_hash:=pg_catalog.sha256(pg_catalog.convert_to(p_answer,'UTF8'));
  select * into prior from feh_ack_authority_private.permissions where lead_id=q.lead_id;
  if found then
    if prior.binding_id=b.id and prior.submitted_at=p_submitted_at and prior.answer_hash=answer_hash and not prior.conflicted then return 'duplicate'; end if;
    perform 1 from public.execution_control_lock where id=1 for update;
    if not found then return 'rejected'; end if;
    if not prior.conflicted then
      update feh_ack_authority_private.permissions set conflicted=true where lead_id=q.lead_id;
      -- Conflicting replays cannot leave a previous YES executable. This is an
      -- internal review hold, not an invented customer opt-out or consent.
      foreach phone in array array[b.allowed_phone,'0'||pg_catalog.substr(b.allowed_phone,4),'00'||pg_catalog.substr(b.allowed_phone,2)] loop
        insert into public.suppression_records(telephone,channel,reason,requested_by,scope,starts_at,evidence_reference)
          values(phone,'SMS','INTERNAL_QUALITY_BLOCK','INTERNAL','PERMANENT',pg_catalog.transaction_timestamp(),
            'ack-permission-conflict:'||q.lead_id::text);
      end loop;
    end if;
    return 'conflict';
  end if;
  if q.status is distinct from 'awaiting_authority' or q.provider_created_at<pg_catalog.clock_timestamp()-interval '24 hours' or
    q.provider_created_at>pg_catalog.clock_timestamp()+interval '5 minutes' or exists(
      select 1 from public.execution_intents where action_id in
        (q.provider||':feh-callback-ack-v1:'||q.external_lead_id,q.provider||':feh-callback-ack-v2:'||q.external_lead_id)) then return 'rejected'; end if;
  insert into feh_ack_authority_private.permissions(lead_id,binding_id,submitted_at,answer,answer_hash)
    values(q.lead_id,b.id,p_submitted_at,answer,answer_hash);
  update public.lead_acknowledgements set template_version='feh-callback-ack-v2' where lead_id=q.lead_id;
  return 'recorded';
end;
$$;

-- Machine-only bridge. Caller supplies only a persisted enquiry identity and
-- the runtime's bounded recipient. All authority is derived from locked rows.
-- New system intents have NULL creator; the human owner is attributed only as
-- the actual approver of the persisted standing rule, never a fabricated login.
create function feh_ack_authority_private.authorize_enquiry(p_lead_id bigint,p_allowed_phone text)
returns table(status text,lead_id bigint,authorization_id bigint,provider_adapter_id bigint)
language plpgsql volatile security definer set search_path='' as $$
declare b feh_ack_authority_private.bindings%rowtype; r feh_ack_authority_private.rules%rowtype;
  p feh_ack_authority_private.permissions%rowtype; prior feh_ack_authority_private.authorizations%rowtype;
  q public.lead_acknowledgements%rowtype; l public.leads%rowtype; c public.contacts%rowtype;
  intent bigint; compliance bigint; approval bigint; v_authorization bigint; adapter bigint;
  nonce uuid; commitment bytea; phone text; t timestamptz; action text; evidence text;
begin
  status:='blocked';
  select * into p from feh_ack_authority_private.permissions x where x.lead_id=p_lead_id;
  if not found or p.answer<>'yes' or p.conflicted then return next; return; end if;
  select * into b from feh_ack_authority_private.bindings where id=p.binding_id for share;
  if not found or b.allowed_phone is distinct from p_allowed_phone then return next; return; end if;
  -- The unique rule lock serializes its one-enquiry budget across processes.
  select * into r from feh_ack_authority_private.rules where binding_id=b.id for update;
  if not found then return next; return; end if;
  select * into prior from feh_ack_authority_private.authorizations x where x.lead_id=p_lead_id;
  if found then
    -- Return the SAME identifiers after restart, never mint a fresh attempt.
    -- Claim/consume/precall still check expiry, STOP and suppression.
    status:='existing'; lead_id:=prior.lead_id; authorization_id:=prior.authorization_id; provider_adapter_id:=prior.adapter_id;
    return next; return;
  end if;
  t:=pg_catalog.clock_timestamp();
  if r.expires_at<=t or p.submitted_at<r.approved_at or p.submitted_at>r.expires_at or
    exists(select 1 from feh_ack_authority_private.authorizations where rule_id=r.id) then return next; return; end if;
  perform 1 from public.execution_authorisers where id=r.grant_id and user_id=r.owner_id and
    user_id=b.owner_id and capability='execution_authoriser' and revoked_at is null for share;
  if not found then return next; return; end if;
  select * into l from public.leads where id=p_lead_id for share;
  select * into q from public.lead_acknowledgements x where x.lead_id=p_lead_id for update;
  if q.lead_id is null or q.status<>'awaiting_authority' or q.template_version<>'feh-callback-ack-v2' or
    q.provider is distinct from b.provider or q.form_id is distinct from b.form_id or q.page_id is distinct from b.page_id or
    l.utm_campaign is distinct from b.campaign_id or l.organisation_id is null or
    l.provider is distinct from q.provider or l.external_lead_id is distinct from q.external_lead_id or
    l.provider_created_at is distinct from p.submitted_at or q.provider_created_at is distinct from p.submitted_at then return next; return; end if;
  -- Refresh after waiting on the queue lock: conflicting permission cannot
  -- race this decision unnoticed. Recorder and authorizer serialize there.
  select * into p from feh_ack_authority_private.permissions x where x.lead_id=p_lead_id;
  if p.answer is distinct from 'yes' or p.conflicted is distinct from false then return next; return; end if;
  phone:=pg_catalog.regexp_replace(pg_catalog.btrim(l.telephone),'[ ()-]','','g');
  if phone ~ '^07' then phone:='+44'||pg_catalog.substr(phone,2);
  elsif phone ~ '^00447' then phone:='+'||pg_catalog.substr(phone,3); end if;
  if phone is distinct from b.allowed_phone then return next; return; end if;
  -- Existing CRM identity only. Missing/ambiguous identity is a review hold;
  -- this bridge neither invents a contact nor attaches a lead to a tenant.
  if (select count(*) from public.contacts x where x.organisation_id=l.organisation_id and pg_catalog.btrim(x.phone)=b.allowed_phone)<>1 then return next; return; end if;
  -- Pin the independently reviewed staging contact, not the first phone match.
  -- A concurrent contact insertion cannot substitute a different identity.
  select * into c from public.contacts x where x.id=b.contact_id and x.organisation_id=l.organisation_id and pg_catalog.btrim(x.phone)=b.allowed_phone for share;
  if not found then return next; return; end if;
  select x.id into adapter from public.execution_provider_adapters x where x.adapter_key='TELNYX_FEH_CALLBACK_ACK_V2' and x.channel='SMS' and
    x.status='approved' and x.approved_by is not null and x.approved_at is not null for share;
  if not found then return next; return; end if;
  action:=q.provider||':feh-callback-ack-v2:'||q.external_lead_id;
  if exists(select 1 from public.execution_intents where action_id in (action,q.provider||':feh-callback-ack-v1:'||q.external_lead_id)) then return next; return; end if;
  -- This subtransaction rolls back ALL newly generated evidence on a failed
  -- live gate/audit. No orphan proposal can be mistaken for an approved send.
  begin
    insert into public.execution_intents(organisation_id,contact_id,requested_channel,action_id,campaign_id,created_by_actor_type,created_by_actor_id)
      values(l.organisation_id,c.id,'SMS',action,l.utm_campaign,'system',null) returning id into intent;
    perform 1 from public.execution_control_lock where id=1 for share;
    if not found or public.evaluate_execution_emergency_stop() is distinct from 'clear' or
      public.evaluate_suppression_live(intent) is distinct from 'clear' or r.expires_at<=pg_catalog.clock_timestamp() then
      raise exception using errcode='PAX01',message='acknowledgement held';
    end if;
    select d.nonce,d.destination_commitment into nonce,commitment from public.derive_destination_commitment(c.id,'SMS') d;
    if public.verify_destination_commitment(c.id,'SMS',nonce,commitment) is distinct from 'verified' then
      raise exception using errcode='PAX01',message='acknowledgement held'; end if;
    evidence:='ack-rule:'||r.id::text||'/permission:'||p_lead_id::text;
    insert into public.compliance_decisions(evaluated_at,organisation_id,contact_id,requested_channel,policy_version,decision,
      identity_tier,consent_status,consent_source,legal_basis,contactability_status,has_email,has_telephone,has_domain,
      destination_commitment_nonce,destination_commitment,expires_at,execution_intent_id)
      values(pg_catalog.clock_timestamp(),l.organisation_id,c.id,'SMS','FEH_CONTACT_PERMISSION_V1','eligible',
      'deterministic','consented',evidence,'consented','contactable',false,true,false,nonce,commitment,r.expires_at,intent) returning id into compliance;
    insert into public.execution_intent_approvals(execution_intent_id,decision,actor_id,execution_authoriser_grant_id,reason,evidence_reference)
      values(intent,'approved',r.owner_id,r.grant_id,r.template_version,evidence) returning id into approval;
    insert into public.execution_authorizations(action_id,idempotency_key,requested_channel,authorization_status,human_approval_state,
      policy_version,authorised_at,expires_at,actor_id,organisation_id,contact_id,campaign_id,outreach_eligibility_status,
      execution_intent_id,execution_authoriser_grant_id,compliance_decision_id,approval_decision_id,evidence)
      values(action,'feh-exec-auth-v2|'||intent::text,'SMS','authorised','approved','feh-ack-standing-rule-staging@1',
      pg_catalog.clock_timestamp(),r.expires_at,r.owner_id,l.organisation_id,c.id,l.utm_campaign,'eligible_for_handoff',
      intent,r.grant_id,compliance,approval,pg_catalog.jsonb_build_object('rule_id',r.id,'permission_lead_id',p_lead_id,
      'approval_mode','owner_delegated_rule','suppression','clear','destination_verification','verified','emergency_state','clear')) returning id into v_authorization;
    insert into feh_ack_authority_private.authorizations(lead_id,rule_id,intent_id,authorization_id,adapter_id)
      values(p_lead_id,r.id,intent,v_authorization,adapter);
    insert into public.audit_log(action,actor_id,entity_type,entity_id,correlation_id,result,metadata)
      values('acknowledgement_rule_authorized',r.owner_id,'lead',p_lead_id::text,pg_catalog.gen_random_uuid(),'success',
      pg_catalog.jsonb_build_object('rule_id',r.id,'authorization_id',v_authorization,'approval_mode','owner_delegated_rule','execution_allowed',false));
  exception when sqlstate 'PAX01' then return next; return;
  end;
  status:='authorised'; lead_id:=p_lead_id; authorization_id:=v_authorization; provider_adapter_id:=adapter;
  return next;
end;
$$;

-- All private functions default-denied, including the authenticated owner RPC.
-- The owner endpoint grant and runtime login provisioning are separate gates.
revoke all on all functions in schema feh_ack_authority_private from public,anon,authenticated,service_role;
create role feh_ack_permission_recorder nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 2 password null;
create role feh_ack_rule_authorizer nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 2 password null;
grant usage on schema feh_ack_authority_private to feh_ack_permission_recorder,feh_ack_rule_authorizer;
grant execute on function feh_ack_authority_private.record_permission(uuid,bigint,timestamptz,text,text) to feh_ack_permission_recorder;
grant execute on function feh_ack_authority_private.authorize_enquiry(bigint,text) to feh_ack_rule_authorizer;
alter role feh_ack_permission_recorder set statement_timeout='1500ms';
alter role feh_ack_permission_recorder set lock_timeout='750ms';
alter role feh_ack_rule_authorizer set statement_timeout='1500ms';
alter role feh_ack_rule_authorizer set lock_timeout='750ms';

-- A new explicit message version preserves all historical v1 approvals.
alter table public.lead_acknowledgements drop constraint lead_acknowledgements_template_version_check;
alter table public.lead_acknowledgements add constraint lead_acknowledgements_template_version_check
  check(template_version in ('feh-callback-ack-v1','feh-callback-ack-v2'));

-- Existing atomic claim with explicit v1/v2 pinning; ACLs unchanged.
create or replace function public.claim_meta_lead_acknowledgement(
  p_lead_id bigint, p_execution_authorization_id bigint, p_provider_adapter_id bigint
)
returns table (
  claim_status text, authorization_id bigint, action_id text, idempotency_key text,
  contact_id bigint, destination text, policy_version text, authorization_expires_at timestamptz,
  claimed_at timestamptz, provider_adapter_id bigint
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_auth public.execution_authorizations%rowtype;
  v_lead public.leads%rowtype;
  v_queue public.lead_acknowledgements%rowtype;
  v_contact public.contacts%rowtype;
  v_approval public.execution_intent_approvals%rowtype;
  v_compliance public.compliance_decisions%rowtype;
  v_adapter public.execution_provider_adapters%rowtype;
  v_intent public.execution_intents%rowtype;
  v_mobile text;
begin
  claim_status := 'blocked';
  if p_lead_id is null or p_lead_id <= 0 or p_execution_authorization_id is null
     or p_execution_authorization_id <= 0 or p_provider_adapter_id is null
     or p_provider_adapter_id <= 0 then return next; return; end if;
  select * into v_auth from public.execution_authorizations ea
    where ea.id = p_execution_authorization_id for update;
  if not found or v_auth.authorization_status is distinct from 'authorised'
     or v_auth.requested_channel is distinct from 'SMS'
     or v_auth.consumed_at is not null or v_auth.execution_performed is distinct from false
     or v_auth.expires_at is null or v_auth.expires_at <= pg_catalog.transaction_timestamp()
     then return next; return; end if;
  select * into v_intent from public.execution_intents ei
    where ei.id = v_auth.execution_intent_id for update;
  if not found or v_intent.contact_id is distinct from v_auth.contact_id
     or v_intent.organisation_id is distinct from v_auth.organisation_id
     or v_intent.requested_channel is distinct from 'SMS'
     or v_intent.action_id is distinct from v_auth.action_id then return next; return; end if;
  select * into v_approval from public.execution_intent_approvals eia
    where eia.execution_intent_id = v_auth.execution_intent_id order by eia.id desc limit 1;
  if not found or v_approval.decision is distinct from 'approved'
     or v_approval.id is distinct from v_auth.approval_decision_id
     or v_approval.reason is null or v_approval.reason not in ('feh-callback-ack-v1','feh-callback-ack-v2')
     or nullif(pg_catalog.btrim(v_approval.evidence_reference), '') is null
     then return next; return; end if;
  perform e.id from public.execution_authorisers e
    where e.id = v_auth.execution_authoriser_grant_id and e.revoked_at is null
      and e.capability = 'execution_authoriser' and e.user_id = v_auth.actor_id for share;
  if not found then return next; return; end if;
  select * into v_lead from public.leads l where l.id = p_lead_id for share;
  if not found or v_lead.provider not in ('meta','google_ads')
     or v_lead.provider is null
     or v_lead.lead_source is distinct from (case v_lead.provider when 'meta' then 'meta_ads' else 'google_ads' end)
     or v_lead.organisation_id is distinct from v_auth.organisation_id
     then return next; return; end if;
  select * into v_queue from public.lead_acknowledgements q where q.lead_id = p_lead_id for update;
  if not found then return next; return; end if;
  if v_queue.status <> 'awaiting_authority' then
    claim_status := 'already_claimed'; return next; return;
  end if;
  if v_queue.provider is distinct from v_lead.provider
     or v_queue.external_lead_id is distinct from v_lead.external_lead_id
     or v_queue.provider_created_at is distinct from v_lead.provider_created_at
     or v_queue.provider_created_at < pg_catalog.transaction_timestamp() - interval '24 hours'
     or v_queue.provider_created_at > pg_catalog.transaction_timestamp() + interval '5 minutes'
     or v_approval.reason is distinct from v_queue.template_version
     or v_queue.template_version not in ('feh-callback-ack-v1','feh-callback-ack-v2')
     or v_auth.action_id is distinct from (v_queue.provider || ':' || v_queue.template_version || ':' || v_queue.external_lead_id)
     then return next; return; end if;
  select * into v_contact from public.contacts c where c.id = v_auth.contact_id for share;
  v_mobile := pg_catalog.regexp_replace(pg_catalog.btrim(v_lead.telephone), '[ ()-]', '', 'g');
  if v_mobile ~ '^07[1-57-9][0-9]{8}$' then v_mobile := '+44' || pg_catalog.substr(v_mobile, 2);
  elsif v_mobile ~ '^00447[1-57-9][0-9]{8}$' then v_mobile := '+' || pg_catalog.substr(v_mobile, 3); end if;
  if v_contact.id is null or v_contact.organisation_id is distinct from v_auth.organisation_id
     or v_mobile is null or v_mobile !~ '^\+447[1-57-9][0-9]{8}$'
     or pg_catalog.btrim(v_contact.phone) is distinct from v_mobile then return next; return; end if;
  select * into v_compliance from public.compliance_decisions cd where cd.id = v_auth.compliance_decision_id;
  if not found or v_compliance.decision is distinct from 'eligible'
     or v_compliance.contact_id is distinct from v_auth.contact_id
     or v_compliance.organisation_id is distinct from v_auth.organisation_id
     or v_compliance.requested_channel is distinct from 'SMS'
     or v_compliance.execution_intent_id is distinct from v_auth.execution_intent_id
     or v_compliance.policy_version is distinct from 'FEH_CONTACT_PERMISSION_V1'
     or v_compliance.expires_at <= pg_catalog.transaction_timestamp()
     or public.verify_destination_commitment(v_auth.contact_id, 'SMS',
       v_compliance.destination_commitment_nonce, v_compliance.destination_commitment) is distinct from 'verified'
     then return next; return; end if;
  select * into v_adapter from public.execution_provider_adapters epa
    where epa.id = p_provider_adapter_id for share;
  if not found or v_adapter.status is distinct from 'approved' or v_adapter.channel is distinct from 'SMS'
     or v_adapter.adapter_key is distinct from (case v_queue.template_version when 'feh-callback-ack-v2' then 'TELNYX_FEH_CALLBACK_ACK_V2' else 'TELNYX_FEH_CALLBACK_ACK_V1' end)
     or v_adapter.approved_by is null or v_adapter.approved_at is null
     then return next; return; end if;
  if public.evaluate_suppression_live(v_auth.execution_intent_id) is distinct from 'clear'
     or public.evaluate_execution_emergency_stop() is distinct from 'clear'
     then return next; return; end if;
  update public.lead_acknowledgements q set status = 'claimed',
    execution_authorization_id = v_auth.id, claimed_at = pg_catalog.transaction_timestamp()
    where q.lead_id = p_lead_id;
  insert into public.audit_log (action, entity_type, entity_id, correlation_id, result, metadata)
  values ('lead_acknowledgement_claimed', 'lead', p_lead_id::text, pg_catalog.gen_random_uuid(), 'success',
    pg_catalog.jsonb_build_object('execution_authorization_id', v_auth.id, 'execution_allowed', false));
  claim_status := 'claimed'; authorization_id := v_auth.id; action_id := v_auth.action_id;
  idempotency_key := v_auth.idempotency_key; contact_id := v_auth.contact_id;
  destination := pg_catalog.btrim(v_contact.phone); policy_version := v_auth.policy_version;
  authorization_expires_at := v_auth.expires_at; claimed_at := pg_catalog.transaction_timestamp();
  provider_adapter_id := v_adapter.id;
  return next;
end;
$$;

-- The receive-only callback correlates both explicitly pinned versions.
create or replace function public.record_acknowledgement_delivery_receipt(
  p_event_id uuid,p_message_id uuid,p_profile_id uuid,p_occurred_at timestamptz,
  p_event_type text,p_delivery_status text,p_from text,p_to text
) returns text language plpgsql volatile security definer set search_path to '' as $$
declare
  v_attempts bigint[];
  v_attempt_id bigint;
  v_receipt public.acknowledgement_delivery_receipts%rowtype;
begin
  if p_event_id is null or p_message_id is null or p_profile_id is null or
    p_occurred_at is null or not pg_catalog.isfinite(p_occurred_at) or
    p_occurred_at > pg_catalog.transaction_timestamp()+interval '5 minutes' or
    p_from is distinct from '+447427851020' or p_to is null or
    p_to !~ '^\+447[1-57-9][0-9]{8}$' or p_event_type is null or p_delivery_status is null or
    not ((p_event_type='message.sent' and p_delivery_status='sent') or
      (p_event_type='message.finalized' and p_delivery_status in
        ('delivered','delivery_failed','sending_failed','delivery_unconfirmed','expired'))) then
    return 'rejected';
  end if;
  -- A receipt can arrive after STOP, grant revocation or expiry. Those controls
  -- prevent NEW execution, not preservation of evidence about an existing send.
  -- An unknown/ambiguous provider identity never falls back to a phone-only match.
  select pg_catalog.array_agg(a.id) into v_attempts
    from public.execution_dispatch_attempts a
    join public.execution_provider_adapters pa on pa.id=a.provider_adapter_id
    join public.execution_authorizations au on au.id=a.execution_authorization_id
    join public.lead_acknowledgements q on q.execution_authorization_id=au.id
    join public.contacts c on c.id=au.contact_id
    join public.compliance_decisions cd on cd.id=au.compliance_decision_id
    where a.provider_reference=p_message_id::text and a.status in ('succeeded','indeterminate')
      and a.created_at<=p_occurred_at+interval '5 minutes'
      and pa.adapter_key=(case q.template_version when 'feh-callback-ack-v1' then 'TELNYX_FEH_CALLBACK_ACK_V1' when 'feh-callback-ack-v2' then 'TELNYX_FEH_CALLBACK_ACK_V2' end) and pa.channel='SMS'
      and au.consumed_at is not null and au.requested_channel='SMS'
      and q.status='claimed' and c.organisation_id=au.organisation_id
      and pg_catalog.btrim(c.phone)=p_to and cd.contact_id=au.contact_id
      and cd.organisation_id=au.organisation_id and cd.requested_channel='SMS'
      and cd.execution_intent_id=au.execution_intent_id
      and public.verify_destination_commitment(au.contact_id,'SMS',
        cd.destination_commitment_nonce,cd.destination_commitment)='verified';
  if pg_catalog.cardinality(v_attempts) is distinct from 1 then return 'unmatched'; end if;
  v_attempt_id:=v_attempts[1];
  insert into public.acknowledgement_delivery_receipts(provider_event_id,occurred_at,
    execution_dispatch_attempt_id,provider_message_id,messaging_profile_id,event_type,delivery_status)
  values(p_event_id,p_occurred_at,v_attempt_id,p_message_id,p_profile_id,p_event_type,p_delivery_status)
  on conflict(provider_event_id) do nothing;
  if not found then
    select * into v_receipt from public.acknowledgement_delivery_receipts where provider_event_id=p_event_id;
    if v_receipt.execution_dispatch_attempt_id is not distinct from v_attempt_id and
      v_receipt.provider_message_id is not distinct from p_message_id and
      v_receipt.messaging_profile_id is not distinct from p_profile_id and
      v_receipt.occurred_at is not distinct from p_occurred_at and
      v_receipt.event_type is not distinct from p_event_type and
      v_receipt.delivery_status is not distinct from p_delivery_status then return 'duplicate'; end if;
    return 'conflict';
  end if;
  insert into public.audit_log(action,entity_type,entity_id,correlation_id,result,metadata)
    values('acknowledgement_delivery_received','execution_dispatch_attempt',v_attempt_id::text,
      p_event_id,'success',pg_catalog.jsonb_build_object('provider','telnyx',
        'event_type',p_event_type,'delivery_status',p_delivery_status,'execution_allowed',false));
  return 'recorded';
end;
$$;


-- Authenticated owner surface. No binding editor, grant creator, STOP release,
-- dispatcher or implicit adoption of the old fictional review is exposed.
create function public.get_ack_automatic_rule_review()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or auth.jwt()->>'iss' is distinct from 'https://vredwhyphrhsudggrsen.supabase.co/auth/v1' or
    auth.jwt()->>'aal' is distinct from 'aal2' or auth.jwt()->>'is_anonymous' is distinct from 'false'
    then return '{"status":"blocked"}'::jsonb; end if;
  return pg_catalog.jsonb_build_object('status','ready','bindings',coalesce((select pg_catalog.jsonb_agg(x.record) from (
    select pg_catalog.jsonb_build_object(
      'id',b.id,'fingerprint',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(b)::text,'UTF8')),'hex'),
      'provider',b.provider,'form_id',b.form_id,'page_id',b.page_id,'campaign_id',b.campaign_id,
      'question_key',b.question_key,'yes_answer',b.affirmative_answer,'no_answer',b.negative_answer,
      'notice_version',b.notice_version,'notice_text',b.notice_text,'review_reference',b.form_review_reference,
      'phone',b.allowed_phone,'cap',1,'window_minutes',15,
      'can_approve',r.id is null and exists(select 1 from public.execution_authorisers g where
        g.user_id=b.owner_id and g.capability='execution_authoriser' and g.revoked_at is null),
      'rule_id',r.id,'approved_at',r.approved_at,'expires_at',r.expires_at,
      'expired',coalesce(r.expires_at<=pg_catalog.statement_timestamp(),false),
      'used',exists(select 1 from feh_ack_authority_private.authorizations a where a.rule_id=r.id),
      'execution_state',coalesce((select case
        when d.status='succeeded' then 'provider_accepted'
        when d.status='failed' then 'provider_failed'
        when d.status='indeterminate' then 'indeterminate'
        when d.id is not null then 'prepared_review_required'
        when q.status='claimed' then 'claimed_review_required'
        else 'authorised_unclaimed' end
        from feh_ack_authority_private.authorizations a
        join public.lead_acknowledgements q on q.lead_id=a.lead_id
        left join public.execution_dispatch_attempts d on d.execution_authorization_id=a.authorization_id
        where a.rule_id=r.id),'not_authorised'),
      'message','Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.'
    ) record from feh_ack_authority_private.bindings b left join feh_ack_authority_private.rules r on r.binding_id=b.id
    where b.owner_id=auth.uid() order by b.id limit 20
  ) x),'[]'::jsonb));
end;
$$;
create function public.approve_ack_automatic_rule(p_binding_id uuid,p_fingerprint text,p_reference uuid)
returns text language plpgsql volatile security definer set search_path='' as $$
declare b feh_ack_authority_private.bindings%rowtype; r uuid;
begin
  if auth.uid() is null or auth.jwt()->>'iss' is distinct from 'https://vredwhyphrhsudggrsen.supabase.co/auth/v1' or
    auth.jwt()->>'aal' is distinct from 'aal2' or auth.jwt()->>'is_anonymous' is distinct from 'false' or p_reference is null
    then return 'blocked'; end if;
  select * into b from feh_ack_authority_private.bindings where id=p_binding_id and owner_id=auth.uid() for share;
  if not found or p_fingerprint is distinct from pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(b)::text,'UTF8')),'hex')
    then return 'blocked'; end if;
  r:=feh_ack_authority_private.approve_rule(b.id,b.notice_text,
    'Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.',
    'owner-screen:'||p_reference::text);
  if r is null then return 'blocked'; end if;
  insert into public.audit_log(action,actor_id,entity_type,entity_id,correlation_id,result,metadata)
    values('ack_staging_rule_adopted',auth.uid(),'ack_rule',r::text,p_reference,'success',
      pg_catalog.jsonb_build_object('binding_id',b.id,'fingerprint',p_fingerprint,'cap',1,'window_minutes',15,'dispatch_performed',false));
  return 'approved';
end;
$$;
revoke all on function public.get_ack_automatic_rule_review(),public.approve_ack_automatic_rule(uuid,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.get_ack_automatic_rule_review(),public.approve_ack_automatic_rule(uuid,text,uuid) to authenticated;

-- Durable discovery after process restart; never resets a claim or attempt.
-- Selection is advisory. authorize_enquiry and existing claim recheck all gates.
create function feh_ack_authority_private.select_enquiry(p_allowed_phone text)
returns table(lead_id bigint) language sql stable security definer set search_path='' as $$
select p.lead_id from feh_ack_authority_private.permissions p
join feh_ack_authority_private.bindings b on b.id=p.binding_id
join feh_ack_authority_private.rules r on r.binding_id=b.id
join public.lead_acknowledgements q on q.lead_id=p.lead_id
join public.execution_authorisers g on g.id=r.grant_id and g.user_id=r.owner_id and g.revoked_at is null and g.capability='execution_authoriser'
where b.allowed_phone=p_allowed_phone and p.answer='yes' and not p.conflicted
  and r.expires_at>pg_catalog.statement_timestamp() and p.submitted_at between r.approved_at and r.expires_at
  and q.status='awaiting_authority' and q.template_version='feh-callback-ack-v2'
  and not exists(select 1 from feh_ack_authority_private.authorizations a where a.rule_id=r.id and a.lead_id<>p.lead_id)
order by p.recorded_at,p.lead_id limit 1;
$$;
revoke all on function feh_ack_authority_private.select_enquiry(text) from public,anon,authenticated,service_role;
grant execute on function feh_ack_authority_private.select_enquiry(text) to feh_ack_rule_authorizer;
