-- Factory 025C Slice 2C.1b: minimum privilege activation.
--
-- WHY THIS EXISTS: external_lead_ingestor (Slice 2C.1a) is a login role
-- with no credential and no grant — created inert on purpose. This
-- migration grants it the exactly one privilege it needs to eventually
-- serve its purpose: EXECUTE on public.ingest_external_lead (Slice 2B),
-- and nothing else. No credential is created here; the role remains
-- unusable from any application code until a later, separately-gated
-- sub-step generates a password. public.ingest_external_lead,
-- public.leads, public.audit_log, and every other existing grant/policy
-- are completely untouched by this file.
--
-- WHY NO TABLE/SCHEMA/DATABASE GRANT IS NEEDED: CONNECT on this database
-- and USAGE on schema public are already available to every role via
-- PUBLIC's own default ACL entries (confirmed live during Slice 2C.1b
-- discovery) — granting them again here would be a redundant no-op. No
-- table privilege is needed because public.ingest_external_lead is
-- SECURITY DEFINER, owned by postgres (who also owns leads and
-- audit_log): the function body runs with postgres's privileges
-- regardless of the caller's own table grants, per PostgreSQL's
-- documented SECURITY DEFINER semantics.
--
-- WHY THIS DOES NOT REOPEN THE authenticated/PUBLIC DEFAULT-ACL GAP:
-- default privileges only apply at object CREATION time (CREATE
-- FUNCTION). This statement is a GRANT against an already-existing
-- function and does not recreate it, so no default-ACL mechanism is
-- triggered, and PUBLIC/anon/authenticated's absence from this
-- function's ACL (fixed in Slice 2B, reconfirmed live immediately before
-- this migration was written) is unaffected.

grant execute on function public.ingest_external_lead(
  p_provider text,
  p_external_lead_id text,
  p_provider_created_at timestamptz,
  p_consent_status text,
  p_company_name text,
  p_contact_name text,
  p_telephone text,
  p_email text,
  p_utm_campaign text
) to external_lead_ingestor;

-- ROLLBACK (documented, not executed): returns external_lead_ingestor to
-- its exact post-2C.1a inert state. Safe at any time — no credential
-- exists yet, so nothing can use this grant either way.
-- revoke execute on function public.ingest_external_lead(
--   p_provider text,
--   p_external_lead_id text,
--   p_provider_created_at timestamptz,
--   p_consent_status text,
--   p_company_name text,
--   p_contact_name text,
--   p_telephone text,
--   p_email text,
--   p_utm_campaign text
-- ) from external_lead_ingestor;
