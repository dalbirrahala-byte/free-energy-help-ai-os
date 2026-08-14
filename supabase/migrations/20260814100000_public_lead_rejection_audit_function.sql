-- Factory 026A: failure/rejection auditability for public.ingest_public_lead.
--
-- WHY THIS EXISTS: Factory 025A (20260812120000_ingest_public_lead_audit_
-- log.sql) added an authoritative SUCCESS audit event written inside
-- ingest_public_lead itself, but explicitly deferred the FAILURE/rejection
-- path, per that migration's own header: "a `raise exception` aborts the
-- whole transaction, so making a failure audit row survive it would
-- require either an autonomous-transaction extension or changing this
-- function's exception-based error contract — both out of scope." Both of
-- those remain true here. This migration takes the smaller path instead: a
-- second, separate, narrowly-scoped SECURITY DEFINER function that the
-- calling Server Action invokes in ITS OWN transaction, after already
-- catching the exception ingest_public_lead raised in its own (aborted)
-- transaction — so this audit row's persistence is never coupled to, and
-- never at risk from, the failed submission it describes.
--
-- public.ingest_public_lead itself is NOT modified, referenced in any
-- write capacity, or affected by this migration in any way. Its signature,
-- body, grants, and behaviour are completely untouched here.
--
-- CLOSED VOCABULARY: p_reason is matched against ingest_public_lead's own
-- six existing exception identifiers (consent_required, invalid_email,
-- invalid_telephone, invalid_company_name, invalid_contact_name,
-- invalid_lead_source) and anything else collapses to 'unknown' — this
-- function can never become a free-text audit-log injection point for a
-- caller invoking the RPC endpoint directly (outside the approved Server
-- Action), matching the same closed-vocabulary discipline already used by
-- public.ingest_external_lead's rejection reasons.
--
-- PII MINIMISATION: no email, telephone, company name, or contact name is
-- ever a parameter here — only a coded reason, the lead_source constant,
-- and a boolean UTM-presence flag, mirroring the existing success-audit
-- event's own metadata shape.
--
-- SCOPE: exactly one new function plus its REVOKE/GRANT statements. No RLS
-- policy is created, altered, or dropped anywhere in this file (per the
-- Factory 026A approval: audit_log's RLS is not touched — this function
-- reaches it the same way ingest_public_lead already reaches public.leads,
-- via SECURITY DEFINER, not via a new anon policy). No table schema
-- change, no other function touched, no role created. public.leads is not
-- referenced anywhere in this file.
--
-- WHY BOTH REVOKE STATEMENTS: Postgres grants EXECUTE to PUBLIC by default
-- on every new function, and this project's own default privileges
-- separately grant `authenticated` EXECUTE on every new function owned by
-- `postgres` — a distinct mechanism from the PUBLIC grant, confirmed live
-- during the Factory 025A grant-divergence discovery
-- (20260812130000_revoke_authenticated_ingest_public_lead.sql) and again
-- during Factory 025C Slice 2B. Both are revoked here proactively, in the
-- SAME migration that creates this function, rather than waiting for a
-- future discovery migration the way ingest_public_lead's own history
-- required. anon's equivalent default grant was already closed
-- project-wide in 20260810110000_harden_function_execute_privileges.sql,
-- so only PUBLIC and authenticated need an explicit revoke here.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION and the REVOKE/GRANT
-- statements are all safe to rerun.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: per Factory 026A instructions, this
-- migration is created for review only and must not be run against
-- Supabase in this session.

create or replace function public.record_public_lead_rejection(
  p_reason text,
  p_lead_source text default null,
  p_has_utm boolean default false
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_reason text;
  v_lead_source text;
begin
  v_reason := case p_reason
    when 'consent_required' then 'consent_required'
    when 'invalid_email' then 'invalid_email'
    when 'invalid_telephone' then 'invalid_telephone'
    when 'invalid_company_name' then 'invalid_company_name'
    when 'invalid_contact_name' then 'invalid_contact_name'
    when 'invalid_lead_source' then 'invalid_lead_source'
    else 'unknown'
  end;

  v_lead_source := left(coalesce(nullif(btrim(p_lead_source), ''), 'unknown'), 100);

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
    null,
    gen_random_uuid(),
    'failure',
    jsonb_build_object(
      'lead_source', v_lead_source,
      'reason', v_reason,
      'has_utm', coalesce(p_has_utm, false)
    )
  );
end;
$$;

revoke all on function public.record_public_lead_rejection(text, text, boolean) from public;

revoke execute on function public.record_public_lead_rejection(text, text, boolean) from authenticated;

grant execute on function public.record_public_lead_rejection(text, text, boolean) to anon;

-- ROLLBACK (documented, not executed)
-- revoke execute on function public.record_public_lead_rejection(text, text, boolean) from anon;
-- drop function if exists public.record_public_lead_rejection(text, text, boolean);
