-- REVIEW CANDIDATE ONLY. Do not apply remotely or through a broad migration run.
-- Main source baseline: dacbdbf67427e6d333f2e0a7130276f89073b782.
-- Dedicated receipt table avoids redefining Meta provider/consent semantics.
-- No role creation, execute grant, route registration or provider authority.
begin;
create table public.website_enquiry_receipts (
 submission_id uuid primary key,
 lead_id bigint not null unique references public.leads(id) on delete restrict,
 payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
alter table public.website_enquiry_receipts enable row level security;
revoke all on table public.website_enquiry_receipts from public, anon, authenticated, service_role;

create function public.ingest_website_enquiry(p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
 v_id uuid;
 v_lead_id bigint;
 v_hash text;
 v_existing public.website_enquiry_receipts%rowtype;
 v_key text;
 v_limit integer;
 v_value jsonb;
 v_submitted timestamptz;
begin
 -- Validate again at the database trust boundary; never trust only the HTTP layer.
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_payload'; end if;
 if (select count(*) from jsonb_object_keys(p_payload - 'businessAnswers')) <> 12
 or not (p_payload ?& array['submissionId','submittedAt','businessName','contactName','email','phone','meterNumbers','currentSupplier','message','smsConsent','attribution','sourcePage']) then raise exception 'invalid_payload'; end if;
 -- Optional structured form answers. Preserve original strings, including approximate
 -- dates and usage bands. An omitted object keeps legacy payloads and hashes intact.
 if p_payload ? 'businessAnswers' then
  if jsonb_typeof(p_payload->'businessAnswers') <> 'object'
    or p_payload->'businessAnswers' = '{}'::jsonb then raise exception 'invalid_payload'; end if;
  for v_key, v_value in select key,value from jsonb_each(p_payload->'businessAnswers') loop
   if v_key not in ('contractEndDate','postcode','annualUsage','industry','annualElectricity','annualGas','sites','energyType','contractEnd','annualSpend')
     or jsonb_typeof(v_value) <> 'string'
     or char_length(v_value #>> '{}') not between 1 and 255 then raise exception 'invalid_payload'; end if;
  end loop;
 end if;
 if jsonb_typeof(p_payload->'submissionId') is distinct from 'string'
 or (p_payload->>'submissionId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'invalid_payload'; end if;
 v_id := (p_payload->>'submissionId')::uuid;
 if jsonb_typeof(p_payload->'submittedAt') is distinct from 'string'
 or (p_payload->>'submittedAt') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then raise exception 'invalid_payload'; end if;
 v_submitted := (p_payload->>'submittedAt')::timestamptz;
 if to_char(v_submitted at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') <> p_payload->>'submittedAt' then raise exception 'invalid_payload'; end if;
 foreach v_key in array array['businessName','contactName','email'] loop
  if jsonb_typeof(p_payload->v_key) is distinct from 'string'
   or btrim(p_payload->>v_key) = '' or char_length(p_payload->>v_key) > 255 then raise exception 'invalid_payload'; end if;
 end loop;
 if (p_payload->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'invalid_payload'; end if;
 foreach v_key in array array['phone','meterNumbers','currentSupplier','message','sourcePage'] loop
  v_limit := case when v_key='phone' then 40 when v_key='message' then 2000 else 255 end;
  v_value := p_payload->v_key;
  if v_value <> 'null'::jsonb and (jsonb_typeof(v_value) is distinct from 'string' or char_length(p_payload->>v_key)>v_limit) then raise exception 'invalid_payload'; end if;
 end loop;
 if (p_payload->'smsConsent') not in ('null'::jsonb,'"yes"'::jsonb,'"no"'::jsonb) then raise exception 'invalid_payload'; end if;
 if jsonb_typeof(p_payload->'attribution') is distinct from 'object' then raise exception 'invalid_payload'; end if;
 if (select count(*) from jsonb_object_keys(p_payload->'attribution')) <> 7
 or not ((p_payload->'attribution') ?& array['utmSource','utmMedium','utmCampaign','utmContent','utmTerm','gclid','fbclid']) then raise exception 'invalid_payload'; end if;
 foreach v_key in array array['utmSource','utmMedium','utmCampaign','utmContent','utmTerm','gclid','fbclid'] loop
  v_value := p_payload->'attribution'->v_key;
  if v_value <> 'null'::jsonb and (jsonb_typeof(v_value) is distinct from 'string' or char_length(p_payload->'attribution'->>v_key)>255) then raise exception 'invalid_payload'; end if;
 end loop;

 v_hash := encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
 -- A transaction-scoped lock serializes this source's same-ID requests.
 -- Hash collisions only serialize unrelated requests; the UUID PK is authoritative.
 perform pg_advisory_xact_lock(hashtextextended('feh-airo-website:' || v_id::text,0));
 select * into v_existing from public.website_enquiry_receipts where submission_id=v_id;
 if found then
  if v_existing.payload_sha256 <> v_hash then return jsonb_build_object('outcome','conflict'); end if;
  return jsonb_build_object('version',1,'submissionId',p_payload->>'submissionId','outcome','duplicate','leadId',v_existing.lead_id::text);
 end if;

 insert into public.leads (
  company_name,contact_name,email,telephone,supplier,status,notes,
  lead_source,source_detail,source_provenance,consent_given,
  utm_source,utm_medium,utm_campaign,utm_content,utm_term,
  lead_owner,next_action,follow_up_required,follow_up_date
 ) values (
  p_payload->>'businessName',p_payload->>'contactName',p_payload->>'email',p_payload->>'phone',p_payload->>'currentSupplier','New',
  (jsonb_build_object('websiteSubmissionId',v_id,'submittedAt',p_payload->>'submittedAt',
   'message',p_payload->'message','meterNumbers',p_payload->'meterNumbers',
   'smsConsentAnswer',p_payload->'smsConsent','sourcePage',p_payload->'sourcePage',
   'gclid',p_payload->'attribution'->'gclid','fbclid',p_payload->'attribution'->'fbclid',
   'permissionNote','Enquiry record only; no automatic contact authority granted.')
   || case when p_payload ? 'businessAnswers' then jsonb_build_object('businessAnswers',p_payload->'businessAnswers')
      else '{}'::jsonb end)::text,
  'Website','Free Energy Help website enquiry','user-entered',false,
  p_payload->'attribution'->>'utmSource',p_payload->'attribution'->>'utmMedium',
  p_payload->'attribution'->>'utmCampaign',p_payload->'attribution'->>'utmContent',p_payload->'attribution'->>'utmTerm',
  null,'Review enquiry and assign follow-up',true,null
 ) returning id into v_lead_id;
 insert into public.website_enquiry_receipts(submission_id,lead_id,payload_sha256) values(v_id,v_lead_id,v_hash);
 insert into public.audit_log(action,entity_type,entity_id,correlation_id,result,metadata)
 values('website_enquiry_received','lead',v_lead_id::text,v_id,'success',jsonb_build_object('source','feh-airo-website','submission_id',v_id));
 -- Audit failure propagates and rolls back lead and receipt. No swallowed errors.
 return jsonb_build_object('version',1,'submissionId',p_payload->>'submissionId','outcome','created','leadId',v_lead_id::text);
end;
$$;
revoke all on function public.ingest_website_enquiry(jsonb) from public, anon, authenticated, service_role;
commit;
-- Activation needs independent migration review, local PostgreSQL proof, exact
-- destination/role approval, drift checks and separate scoped execution grant.
-- Rollback must preserve receipt/lead data; no automatic destructive down SQL.
