-- Construction only. Install/provision separately in vredwhyphrhsudggrsen.
-- No binding, password, LOGIN, execution authority, adapter, STOP/RELEASE,
-- provider configuration, consent upgrade or sending is activated here.
-- Reuse suppression_records + Factory041 live suppression and coordination lock.
create schema feh_ack_callback_private;
revoke all on schema feh_ack_callback_private from public,anon,authenticated,service_role;

-- Empty on installation. A separately reviewed staging configuration must pin
-- exactly one profile and test handset. Never derive scope from webhook input.
create table feh_ack_callback_private.scope (
  id boolean primary key default true check(id),
  profile_id uuid not null,
  allowed_phone text not null check(allowed_phone ~ '^\+447[1-57-9][0-9]{8}$' and allowed_phone <> '+447427851020'),
  approval_reference text not null check(length(btrim(approval_reference)) between 1 and 500)
);
create table feh_ack_callback_private.customer_replies (
  provider_event_id uuid primary key,
  provider_message_id uuid not null unique,
  profile_id uuid not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  telephone text not null,
  reply_kind text not null check(reply_kind in ('STOP','START')),
  suppression_id bigint references public.suppression_records(id) on delete restrict,
  national_suppression_id bigint references public.suppression_records(id) on delete restrict,
  international_suppression_id bigint references public.suppression_records(id) on delete restrict,
  check ((reply_kind='STOP' and suppression_id is not null and national_suppression_id is not null and international_suppression_id is not null)
    or (reply_kind='START' and suppression_id is null and national_suppression_id is null and international_suppression_id is null))
);
alter table feh_ack_callback_private.scope enable row level security;
alter table feh_ack_callback_private.customer_replies enable row level security;
revoke all on all tables in schema feh_ack_callback_private from public,anon,authenticated,service_role;

create function public.record_acknowledgement_callback(
  p_event_id uuid,p_message_id uuid,p_profile_id uuid,p_occurred_at timestamptz,
  p_event_type text,p_delivery_status text,p_from text,p_to text
) returns text language plpgsql volatile security definer set search_path to '' as $$
declare
  v_scope feh_ack_callback_private.scope%rowtype;
  v_prior feh_ack_callback_private.customer_replies%rowtype;
  v_phone text;
  v_id bigint;
  v_ids bigint[] := array[]::bigint[];
begin
  select * into v_scope from feh_ack_callback_private.scope where id for share;
  if not found or p_profile_id is distinct from v_scope.profile_id or
    p_event_id is null or p_message_id is null or p_occurred_at is null or
    not pg_catalog.isfinite(p_occurred_at) or p_occurred_at > pg_catalog.clock_timestamp()+interval '5 minutes' then
    return 'rejected';
  end if;

  if p_event_type in ('message.sent','message.finalized') then
    if p_from is distinct from '+447427851020' or p_to is distinct from v_scope.allowed_phone then return 'rejected'; end if;
    return public.record_acknowledgement_delivery_receipt(p_event_id,p_message_id,p_profile_id,
      p_occurred_at,p_event_type,p_delivery_status,p_from,p_to);
  end if;
  if p_event_type is distinct from 'message.received' or p_delivery_status is null or
    p_delivery_status not in ('STOP','START') or p_from is distinct from v_scope.allowed_phone or
    p_to is distinct from '+447427851020' then return 'rejected'; end if;

  -- Same mutex used by Factory041 STOP/checkpoints. Preserve replies even while
  -- global STOP is set, grants expire, or adapters are disabled. Missing mutex
  -- fails closed. No lock of intent/authorization follows (avoids inversion).
  perform 1 from public.execution_control_lock where id=1 for update;
  if not found then return 'rejected'; end if;

  select * into v_prior from feh_ack_callback_private.customer_replies where provider_event_id=p_event_id;
  if found then
    if v_prior.provider_message_id=p_message_id and v_prior.profile_id=p_profile_id and
      v_prior.occurred_at=p_occurred_at and v_prior.telephone=p_from and v_prior.reply_kind=p_delivery_status then
      return 'duplicate';
    end if;
    return 'conflict';
  end if;
  -- A provider retry with a new event ID still cannot apply the same message twice.
  select * into v_prior from feh_ack_callback_private.customer_replies where provider_message_id=p_message_id;
  if found then
    if v_prior.profile_id=p_profile_id and v_prior.occurred_at=p_occurred_at and
      v_prior.telephone=p_from and v_prior.reply_kind=p_delivery_status then return 'duplicate'; end if;
    return 'conflict';
  end if;

  if p_delivery_status='STOP' then
    -- Existing suppression evaluator strips punctuation but does not equate UK
    -- national/+44/0044 prefixes. Record all three exact equivalents, without
    -- changing its established semantics for other channels/countries.
    foreach v_phone in array array[p_from,'0'||pg_catalog.substr(p_from,4),'00'||pg_catalog.substr(p_from,2)] loop
      select id into v_id from public.suppression_records
        where telephone=v_phone and channel='SMS' and reason='CONSENT_WITHDRAWN'
          and requested_by='ORGANISATION' and scope='PERMANENT' and ends_at is null
          and starts_at<=pg_catalog.clock_timestamp() and organisation_id is null and contact_id is null
          and email is null and domain is null and source_id is null and campaign_id is null
          and evidence_reference like 'telnyx-sms-stop:%'
        order by id limit 1;
      if v_id is null then
        insert into public.suppression_records(telephone,channel,reason,requested_by,scope,starts_at,evidence_reference)
          values(v_phone,'SMS','CONSENT_WITHDRAWN','ORGANISATION','PERMANENT',
            least(p_occurred_at,pg_catalog.transaction_timestamp()),'telnyx-sms-stop:'||p_event_id::text)
          returning id into v_id;
      end if;
      v_ids:=pg_catalog.array_append(v_ids,v_id);
    end loop;
  end if;

  insert into feh_ack_callback_private.customer_replies(provider_event_id,provider_message_id,
    profile_id,occurred_at,telephone,reply_kind,suppression_id,national_suppression_id,international_suppression_id)
    values(p_event_id,p_message_id,p_profile_id,p_occurred_at,p_from,p_delivery_status,v_ids[1],v_ids[2],v_ids[3]);
  -- START is recorded for review only. It never deletes/ends a suppression,
  -- changes consent, resets a claim, creates authority or releases global STOP.
  insert into public.audit_log(action,entity_type,entity_id,correlation_id,result,metadata)
    values('acknowledgement_customer_reply','sms_callback',p_event_id::text,p_event_id,'success',
      pg_catalog.jsonb_build_object('provider','telnyx','reply_kind',p_delivery_status,
        'effect',case when p_delivery_status='STOP' then 'sms_suppressed' else 'review_required' end,
        'execution_allowed',false));
  return 'recorded';
end;
$$;
revoke all on function public.record_acknowledgement_callback(uuid,uuid,uuid,timestamptz,text,text,text,text)
  from public,anon,authenticated,service_role;

-- Separate callback-only identity. It cannot assume ingestion/worker roles,
-- read tables, write arbitrary SQL data, create authority or operate STOP.
-- NOLOGIN + empty binding means migration application itself activates nothing.
create role feh_ack_preview_callback nologin noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls connection limit 2 password null;
grant usage on schema public to feh_ack_preview_callback;
grant execute on function public.record_acknowledgement_callback(uuid,uuid,uuid,timestamptz,text,text,text,text)
  to feh_ack_preview_callback;
alter role feh_ack_preview_callback set statement_timeout='1500ms';
alter role feh_ack_preview_callback set lock_timeout='750ms';
alter role feh_ack_preview_callback set idle_in_transaction_session_timeout='3s';
alter role feh_ack_preview_callback set search_path='pg_catalog';

-- Recovery: disable the callback flag and LOGIN, preserve receipts/suppressions,
-- then revoke EXECUTE after sessions drain. Never delete opt-outs to roll back.

-- Freshness correction: a worker transaction can begin before a STOP callback
-- commits, then wait on the common mutex. Transaction-start time must not
-- make a newly committed suppression appear future-dated at checkpoint #3.
-- Preserve matching/ACL semantics; evaluate effective dates at the live clock.
create or replace function public.evaluate_suppression_live(
  p_execution_intent_id bigint
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_intent_organisation_id bigint;
  v_intent_contact_id bigint;
  v_intent_requested_channel text;
  v_intent_source_id bigint;
  v_intent_campaign_id text;
  v_contact_organisation_id bigint;
  v_email text;
  v_phone text;
  v_domain text;
  v_email_norm text;
  v_phone_norm text;
  v_domain_norm text;
  v_organisation_exists boolean;
  v_suppressed boolean;
begin
  -- p_execution_intent_id structural precondition -- rejected before any
  -- table lookup, matching public.verify_destination_commitment()'s
  -- identical Phase 16B.2b-5i-R1 hardening.
  if p_execution_intent_id is null or p_execution_intent_id <= 0 then
    return 'evaluation_failed';
  end if;

  -- Authoritative derivation, sole source: public.execution_intents.
  -- organisation_id, contact_id, requested_channel, source_id, and
  -- campaign_id are never accepted from the caller -- see
  -- "EXECUTION-INTENT-ANCHORED DERIVATION" above.
  select ei.organisation_id, ei.contact_id, ei.requested_channel,
         ei.source_id, ei.campaign_id
    into v_intent_organisation_id, v_intent_contact_id,
         v_intent_requested_channel, v_intent_source_id, v_intent_campaign_id
  from public.execution_intents ei
  where ei.id = p_execution_intent_id;

  if v_intent_contact_id is null then
    return 'evaluation_failed';
  end if;

  -- requested_channel: closed allow-list, re-validated defensively even
  -- though public.execution_intents' own CHECK constraint already
  -- guarantees this -- see "FAIL-CLOSED CASES" above.
  if v_intent_requested_channel is null
     or v_intent_requested_channel not in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')
  then
    return 'evaluation_failed';
  end if;

  -- Authoritative contact load. A nonexistent contact is not
  -- distinguished from any other structural failure.
  select c.organisation_id, c.email, c.phone
    into v_contact_organisation_id, v_email, v_phone
  from public.contacts c
  where c.id = v_intent_contact_id;

  if v_contact_organisation_id is null then
    return 'evaluation_failed';
  end if;

  -- Identity consistency: the contact's CURRENT organisation_id must
  -- still equal the organisation_id the execution_intent was created
  -- with -- see "IDENTITY CONSISTENCY CHECK" above.
  if v_contact_organisation_id <> v_intent_organisation_id then
    return 'evaluation_failed';
  end if;

  -- Authoritative organisation domain, looked up via the INTENT's own
  -- organisation_id (now confirmed equal to the contact's own).
  select true, o.domain
    into v_organisation_exists, v_domain
  from public.organisations o
  where o.id = v_intent_organisation_id;

  if v_organisation_exists is null then
    return 'evaluation_failed';
  end if;

  -- Input-side normalisation, byte-for-byte mirroring
  -- evaluateSuppression.ts's normaliseEmail/normaliseTelephone/
  -- normaliseDomain. See this migration's header for the full
  -- field-by-field derivation.
  v_email_norm := pg_catalog.lower(pg_catalog.btrim(v_email));
  if v_email_norm = '' then
    v_email_norm := null;
  end if;

  v_phone_norm := pg_catalog.regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  if pg_catalog.length(v_phone_norm) < 10 then
    v_phone_norm := null;
  end if;

  v_domain_norm := pg_catalog.lower(pg_catalog.btrim(v_domain));
  v_domain_norm := pg_catalog.regexp_replace(v_domain_norm, '^www\.', '');
  v_domain_norm := pg_catalog.regexp_replace(v_domain_norm, '/+$', '');
  if v_domain_norm = '' then
    v_domain_norm := null;
  end if;

  -- AND-of-populated-fields match against every active suppression_
  -- records row, with row-side normalisation computed per candidate via
  -- a LATERAL subquery -- see "MULTI-FIELD MATCHING IMPLEMENTATION"
  -- above for why this precisely reproduces matchFields().
  select exists (
    select 1
    from public.suppression_records sr
    cross join lateral (
      select
        nullif(pg_catalog.lower(pg_catalog.btrim(sr.email)), '') as sr_email_norm,
        nullif(
          case
            when pg_catalog.length(
              pg_catalog.regexp_replace(coalesce(sr.telephone, ''), '[^0-9]', '', 'g')
            ) >= 10
            then pg_catalog.regexp_replace(sr.telephone, '[^0-9]', '', 'g')
            else null
          end,
          ''
        ) as sr_phone_norm,
        nullif(
          pg_catalog.regexp_replace(
            pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(sr.domain)), '^www\.', ''),
            '/+$', ''
          ),
          ''
        ) as sr_domain_norm
    ) norm
    where sr.starts_at <= pg_catalog.clock_timestamp()
      and (sr.ends_at is null or sr.ends_at > pg_catalog.clock_timestamp())
      and (sr.organisation_id is null or sr.organisation_id = v_intent_organisation_id)
      and (sr.contact_id is null or sr.contact_id = v_intent_contact_id)
      and (norm.sr_email_norm is null or norm.sr_email_norm = v_email_norm)
      and (norm.sr_phone_norm is null or norm.sr_phone_norm = v_phone_norm)
      and (norm.sr_domain_norm is null or norm.sr_domain_norm = v_domain_norm)
      and (sr.source_id is null or sr.source_id = v_intent_source_id)
      and (sr.campaign_id is null or sr.campaign_id = v_intent_campaign_id)
      and (sr.channel is null or sr.channel = v_intent_requested_channel)
  ) into v_suppressed;

  if v_suppressed then
    return 'suppressed';
  end if;

  return 'clear';
end;
$$;
