-- Factory 024 Phase 2B: tightly-scoped public lead-ingestion function.
--
-- WHY THIS EXISTS: the public business-energy-quote form currently writes
-- to browser localStorage only (see Factory 024 planning). Connecting it
-- to real lead creation requires an anonymous caller to be able to insert
-- exactly one kind of row into public.leads, and nothing else. Per the
-- Factory 024 Phase 2 security design review, this is done via a narrow
-- SECURITY DEFINER function (Model B) rather than an anon INSERT RLS
-- policy (Model A) or a service-role credential (Model C):
--   - Model A was rejected because an RLS `with check` clause can only
--     constrain a handful of column values, leaving every other column
--     (contract_end, supplier, lead_source, notes, ...) unconstrained for
--     any anonymous caller.
--   - Model C was rejected because this project has deliberately never
--     used a service-role key anywhere, and doing so here would bypass
--     RLS on every table, not just this one, for a feature that doesn't
--     need that scope.
--   - Model B (this file) gives the anonymous caller EXECUTE on one
--     function whose parameter list *is* the entire contract — protected
--     columns (id, created_at, status, source_provenance, supplier,
--     contract_end) are not parameters at all, so there is no route for a
--     caller to influence them, structurally, not just by convention.
--
-- SCOPE: creates exactly one function, revokes its default PUBLIC execute
-- grant, and grants EXECUTE to anon only. No RLS policy is created,
-- altered, or dropped anywhere in this file. No other table, column,
-- constraint, trigger, or existing function is touched. authenticated is
-- deliberately NOT granted EXECUTE here — internal staff already have a
-- richer, permission-checked INSERT path (leads_insert_write_roles) that
-- this narrow function is not meant to replace or duplicate.
--
-- SECURITY HARDENING: SECURITY DEFINER + SET search_path TO '' (identical
-- pattern to the existing public.is_admin() function), every reference to
-- public.leads fully schema-qualified, no dynamic SQL anywhere in the
-- body (a single static INSERT using bound parameters), consent_given is
-- independently re-validated inside the function (never trusts a caller
-- claim alone), and only the new row's id is returned — never the full
-- inserted record.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to rerun, matching
-- every other function in this migration chain (is_admin, user_can_write,
-- set_updated_at). The GRANT/REVOKE statements are also safe to rerun.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: creating this function grants no
-- one anything until GRANT EXECUTE runs (included below, scoped to anon
-- only), and inserts no data by itself.

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

  return v_new_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function —
-- this must be explicitly revoked, exactly as Factory 022 found and fixed
-- for user_can_write(). Then grant to anon only; authenticated is
-- deliberately not granted this function (see comment above).
revoke all on function public.ingest_public_lead(
  text, text, text, text, text, boolean, text, text, text, text, text, text, text
) from public;

grant execute on function public.ingest_public_lead(
  text, text, text, text, text, boolean, text, text, text, text, text, text, text
) to anon;

-- ROLLBACK (documented, not executed)
-- revoke execute on function public.ingest_public_lead(
--   text, text, text, text, text, boolean, text, text, text, text, text, text, text
-- ) from anon;
-- drop function if exists public.ingest_public_lead(
--   text, text, text, text, text, boolean, text, text, text, text, text, text, text
-- );
