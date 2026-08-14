-- Factory 026A: deterministic, server-side double-submission suppression
-- for public.ingest_public_lead (Tier A — first-party website form leads).
--
-- WHY THIS EXISTS: ingest_public_lead has no duplicate protection today —
-- every call inserts a new row, so a double-click past the form's disabled
-- state, a browser back-button resubmit, or a network-retry all create two
-- (or more) leads for what is really one enquiry. This is a genuinely
-- different problem from Tier B's (provider, external_lead_id) idempotency
-- (Factory 025C), and per the Factory 026A architecture decision, Tier A
-- gets its OWN, independent dedup strategy — it does NOT reuse, extend, or
-- depend on the Tier B mechanism, the dormant external_lead_ingestor role,
-- or public.ingest_external_lead in any way. A first-party human filling
-- in a form has no "provider-issued identifier" to key off, and forcing
-- one onto this pathway would misuse a column/index designed for a
-- fundamentally different trust model (already-verified, server-to-server
-- webhook redelivery vs. an anonymous browser submission).
--
-- STRATEGY: before inserting, look for an existing lead with the SAME
-- normalised email AND the SAME normalised telephone AND the SAME
-- lead_source, created within the last 10 minutes. If found, treat this
-- submission as a resubmission of that same enquiry and return its id
-- instead of inserting a new row — the caller's contract (`returns
-- bigint`, a valid lead id either way) is completely unchanged, so
-- business-energy-quote/actions.ts and everything downstream (CRM,
-- Factory 024 Revenue Engine) needs no change and cannot tell the
-- difference between a fresh insert and a suppressed duplicate.
--
-- WHY BOTH FIELDS, AND WHY A SHORT WINDOW: matching on email OR telephone
-- alone risks merging two genuinely different people at the same company
-- who happen to share one contact detail (a shared office phone line, a
-- shared enquiries@ mailbox). Requiring BOTH to match, scoped to the same
-- lead_source, makes a false-positive merge of unrelated enquiries highly
-- unlikely. The 10-minute window is deliberately short: it exists only to
-- absorb an accidental resubmission of the SAME act of filling in the
-- form, never to treat a genuine future re-enquiry from the same contact
-- (an hour later, a day later, a renewal cycle later) as a duplicate of an
-- earlier one — per the Factory 026A requirement that duplicate
-- suppression must never incorrectly merge genuinely separate enquiries.
-- lib/revenue-engine/duplicateDetection.ts remains the advisory,
-- human-reviewed, no-time-limit check for everything outside this narrow
-- window; this migration does not replace or duplicate that logic, it
-- only prevents the narrow, high-confidence case of an immediate
-- resubmission from ever reaching the leads table as two rows.
--
-- ATTRIBUTION PRESERVATION: when a duplicate is suppressed, the ORIGINAL
-- row's attribution fields (utm_source/utm_medium/utm_campaign/utm_term/
-- utm_content, source_detail, created_at) are left completely untouched —
-- the incoming submission's attribution values are discarded, not merged
-- or overwritten, so the first-touch attribution is never silently
-- replaced by a resubmission's (possibly different, e.g. if a UTM
-- parameter dropped off a reloaded URL) values. No existing public.leads
-- row is modified by this migration in any way.
--
-- NO NEW INDEX: this migration deliberately adds no index to support the
-- dedup lookup — email/telephone/lead_source/created_at are all existing,
-- unindexed columns already, and expected lead volume does not yet
-- warrant the added review surface of a new index in this narrow fix. If
-- website lead volume grows enough for this to matter, adding a
-- supporting index is a small, separate, additive follow-up.
--
-- SCOPE: CREATE OR REPLACE of the one existing function, function body
-- only (same signature, same SECURITY DEFINER, same search_path, same
-- validation, same protected-column exclusion, same return type). Same
-- REVOKE/GRANT pair as every prior ingest_public_lead migration, restated
-- for self-containment — see WHY BOTH REVOKE STATEMENTS below. No RLS
-- policy, no table schema change, no other function, no role, no other
-- grant. No existing public.leads row is inserted, updated, or deleted by
-- this file's presence — CREATE OR REPLACE FUNCTION only changes what
-- future calls do.
--
-- WHY BOTH REVOKE STATEMENTS: CREATE OR REPLACE FUNCTION re-triggers this
-- project's default privileges, which separately and automatically grant
-- `authenticated` EXECUTE on every function owned by `postgres` at
-- (re)creation time — this is exactly the gap Factory 025A's grant-
-- divergence discovery found and fixed once already
-- (20260812130000_revoke_authenticated_ingest_public_lead.sql), after an
-- earlier CREATE OR REPLACE (20260812120000) silently reopened it. This
-- migration proactively revokes `authenticated` again in the same file,
-- rather than relying on a future discovery migration to notice the same
-- regression a second time. `anon`'s equivalent default was already closed
-- project-wide, so only PUBLIC and authenticated need an explicit revoke.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION and the REVOKE/GRANT
-- statements are all safe to rerun.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: per Factory 026A instructions, this
-- migration is created for review only and must not be run against
-- Supabase in this session.

create or replace function public.ingest_public_lead(
  p_company_name text,
  p_contact_name text,
  p_telephone text,
  p_email text,
  p_lead_source text,
  p_consent_given boolean,
  p_source_detail text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_term text default null,
  p_utm_content text default null,
  p_additional_context text default null
)
returns bigint
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_company_name text;
  v_contact_name text;
  v_telephone text;
  v_email text;
  v_lead_source text;
  v_source_detail text;
  v_utm_source text;
  v_utm_medium text;
  v_utm_campaign text;
  v_utm_term text;
  v_utm_content text;
  v_additional_context text;
  v_new_id bigint;
  v_existing_id bigint;
begin
  -- Consent is re-validated here regardless of any caller-side check —
  -- this is the one field where a request must be rejected outright
  -- rather than defaulted or coerced.
  if p_consent_given is distinct from true then
    raise exception 'consent_required';
  end if;

  v_company_name := btrim(p_company_name);
  v_contact_name := btrim(p_contact_name);
  v_telephone := btrim(p_telephone);
  v_email := lower(btrim(p_email));
  v_lead_source := btrim(p_lead_source);
  v_source_detail := btrim(p_source_detail);

  if v_company_name is null or v_company_name = '' or length(v_company_name) > 200 then
    raise exception 'invalid_company_name';
  end if;

  if v_contact_name is null or v_contact_name = '' or length(v_contact_name) > 200 then
    raise exception 'invalid_contact_name';
  end if;

  if v_telephone is null
     or length(regexp_replace(v_telephone, '[^0-9]', '', 'g')) < 10
     or length(v_telephone) > 30
  then
    raise exception 'invalid_telephone';
  end if;

  if v_email is null
     or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  then
    raise exception 'invalid_email';
  end if;

  -- lead_source/source_detail are server-forced by the calling code (the
  -- Server Action always passes a fixed literal, e.g. 'Website') — this
  -- only guards against a caller-layer coding mistake sending an empty
  -- value through, not against a member of the public choosing it.
  if v_lead_source is null or v_lead_source = '' then
    raise exception 'invalid_lead_source';
  end if;

  if v_source_detail is not null and length(v_source_detail) > 200 then
    v_source_detail := left(v_source_detail, 200);
  end if;

  -- Attribution/context fields are enrichment, not identity — truncated
  -- rather than rejected, so a malformed or oversized UTM value never
  -- blocks a genuine enquiry.
  v_utm_source := left(nullif(btrim(p_utm_source), ''), 150);
  v_utm_medium := left(nullif(btrim(p_utm_medium), ''), 150);
  v_utm_campaign := left(nullif(btrim(p_utm_campaign), ''), 150);
  v_utm_term := left(nullif(btrim(p_utm_term), ''), 150);
  v_utm_content := left(nullif(btrim(p_utm_content), ''), 150);
  v_additional_context := left(nullif(btrim(p_additional_context), ''), 500);

  -- Factory 026A: deterministic double-submission suppression. Both email
  -- and telephone (normalised) must match an existing row of the same
  -- lead_source created within the last 10 minutes — see file header for
  -- the full reasoning. No existing row is ever modified here; a match
  -- only changes what this call returns.
  select id
    into v_existing_id
  from public.leads
  where lower(email) = v_email
    and regexp_replace(telephone, '[^0-9]', '', 'g') = regexp_replace(v_telephone, '[^0-9]', '', 'g')
    and lead_source = v_lead_source
    and created_at >= now() - interval '10 minutes'
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    begin
      insert into public.audit_log (
        action, actor_id, actor_role, entity_type, entity_id,
        correlation_id, result, metadata
      ) values (
        'public_lead_duplicate_suppressed', null, null, 'lead', v_existing_id::text,
        gen_random_uuid(), 'success',
        jsonb_build_object('lead_source', v_lead_source, 'window_minutes', 10)
      );
    exception
      when others then
        null;
    end;

    return v_existing_id;
  end if;

  -- Protected columns are never parameters above, so there is no value to
  -- pass through for id, created_at, supplier, or contract_end — id and
  -- created_at use their existing column defaults; supplier and
  -- contract_end are simply omitted, leaving them NULL.
  insert into public.leads (
    company_name,
    contact_name,
    telephone,
    email,
    status,
    notes,
    lead_source,
    source_detail,
    source_provenance,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    consent_given
  ) values (
    v_company_name,
    v_contact_name,
    v_telephone,
    v_email,
    'New',
    v_additional_context,
    v_lead_source,
    v_source_detail,
    'user-entered',
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_utm_term,
    v_utm_content,
    true
  )
  returning id into v_new_id;

  -- Factory 025A: authoritative success audit event, written inside this
  -- already-trusted boundary. A failure here is caught locally and
  -- discarded — it must never undo or block the lead that was just
  -- created.
  begin
    insert into public.audit_log (
      action,
      actor_id,
      actor_role,
      entity_type,
      entity_id,
      correlation_id,
      result,
      metadata
    ) values (
      'public_lead_ingested',
      null,
      null,
      'lead',
      v_new_id::text,
      gen_random_uuid(),
      'success',
      jsonb_build_object(
        'lead_source', v_lead_source,
        'utm_source', v_utm_source,
        'utm_medium', v_utm_medium,
        'utm_campaign', v_utm_campaign
      )
    );
  exception
    when others then
      null;
  end;

  return v_new_id;
end;
$$;

revoke all on function public.ingest_public_lead(
  text, text, text, text, text, boolean, text, text, text, text, text, text, text
) from public;

grant execute on function public.ingest_public_lead(
  text, text, text, text, text, boolean, text, text, text, text, text, text, text
) to anon;

revoke execute on function public.ingest_public_lead(
  text, text, text, text, text, boolean, text, text, text, text, text, text, text
) from authenticated;

-- ROLLBACK (documented, not executed): a further migration re-running
-- CREATE OR REPLACE FUNCTION with this function's pre-026A body (the
-- exact definition in 20260812120000_ingest_public_lead_audit_log.sql) is
-- the safe way back — not a DROP, since anon's EXECUTE grant and the
-- function's existence must not be interrupted mid-rollback. Any
-- audit_log rows already written under the 026A definition (including
-- 'public_lead_duplicate_suppressed' events) are harmless residue and need
-- no cleanup; no public.leads data is affected either direction.
