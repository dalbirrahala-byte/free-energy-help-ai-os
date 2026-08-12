-- Factory 025A: authoritative success audit event for public lead ingestion.
--
-- WHY THIS EXISTS: discovery (Factory 025A audit/RLS gap review) found that
-- public.audit_log's INSERT policy (audit_log_insert_self, 20260806120000_
-- repair_rls_and_audit_log.sql) grants INSERT to `authenticated` only —
-- there is no `anon` policy, and there must not be one (see security
-- position below). Since public.ingest_public_lead() is called by `anon`,
-- an application-layer attempt to write audit_log for a public submission
-- is rejected by RLS and silently degrades. This migration closes that gap
-- the way the Architect's review concluded is safe: by having the
-- authoritative audit event written *inside* the same already-trusted
-- SECURITY DEFINER boundary that already writes public.leads on `anon`'s
-- behalf, rather than granting `anon` any access to audit_log directly.
--
-- SCOPE: CREATE OR REPLACE of the one existing function, function body
-- only. Same signature, same SECURITY DEFINER, same `search_path = ''`,
-- same validation, same public.leads INSERT, same return value. The only
-- addition is one further INSERT into public.audit_log, attempted only
-- after the leads row has already been inserted, wrapped in its own
-- exception-swallowing sub-block so an audit-write failure can never
-- undo or block a legitimate lead. No RLS policy, no grant, and no other
-- function or table is touched by this file. Failure/rejection paths
-- (consent_required, invalid_email, etc.) are NOT audited by this
-- migration — deliberately deferred, see the Factory 025A discovery
-- report (a `raise exception` aborts the whole transaction, so making a
-- failure audit row survive it would require either an autonomous-
-- transaction extension or changing this function's exception-based
-- error contract — both out of scope for this narrow fix).
--
-- REPO RULE: this is a NEW file, not an edit to the already-applied
-- 20260812110000_ingest_public_lead_function.sql, per the standing rule
-- restated in 20260806120000's own header: never modify a migration
-- already recorded as applied remotely.
--
-- PII MINIMISATION: audit metadata carries only lead_source and the UTM
-- attribution fields already passed into this function — never company
-- name, contact name, email, telephone, notes/additional_context, or any
-- other free-text/request-payload value.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to rerun, and the
-- REVOKE/GRANT pair below is restated unchanged (not broadened) purely so
-- this migration is self-contained and safe to apply on its own.

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
  -- already-trusted boundary (this function already bypasses public.leads'
  -- RLS the same way it now bypasses public.audit_log's — no new grant on
  -- either table). The lead row above is already inserted by the time we
  -- reach this point, so it is committed as part of this same transaction
  -- regardless of what happens next. A failure here (audit_log locked,
  -- unexpected constraint, anything) is caught locally by this sub-block
  -- and discarded — it must never undo or block the lead that was just
  -- created. Metadata is limited to lead_source and UTM attribution only.
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

-- Unchanged from 20260812110000 — restated, not broadened. CREATE OR
-- REPLACE FUNCTION on an existing same-signature function does not reset
-- its privileges (the function's OID, and therefore its grants, is
-- preserved), so this pair is not strictly required for correctness here.
-- It is repeated anyway, byte-for-byte identical to 20260812110000, so
-- this migration is self-contained and independently auditable: anyone
-- reading only this file can see the full, unchanged grant state without
-- also having to read the prior migration. authenticated remains
-- deliberately ungranted.
revoke all on function public.ingest_public_lead(
  text, text, text, text, text, boolean, text, text, text, text, text, text, text
) from public;

grant execute on function public.ingest_public_lead(
  text, text, text, text, text, boolean, text, text, text, text, text, text, text
) to anon;

-- ROLLBACK (documented, not executed): a further migration re-running
-- CREATE OR REPLACE FUNCTION with this function's pre-025A body (the
-- exact definition in 20260812110000_ingest_public_lead_function.sql) is
-- the safe way back — not a DROP, since anon's EXECUTE grant and the
-- function's existence must not be interrupted mid-rollback. Any
-- audit_log rows already written under the 025A definition are harmless
-- residue and need no cleanup; no public.leads data is affected either
-- direction.
