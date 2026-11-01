-- Preserve the two FEH form answers in existing CRM notes, atomically with
-- first receipt/reservation. This constructs no sending or consent authority.
-- Keep the nine-argument function for existing callers and rollback. The new
-- overload has no defaults: old calls remain unambiguous.
create function public.ingest_meta_lead_with_acknowledgement(
  p_page_id text, p_form_id text, p_external_lead_id text,
  p_provider_created_at timestamptz, p_company_name text,
  p_contact_name text, p_telephone text, p_email text, p_campaign_id text,
  p_contract_end_answer text, p_monthly_spend_answer text
)
returns table (outcome text, lead_id bigint, acknowledgement_reserved boolean)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_receipt record;
  v_contract text := nullif(pg_catalog.btrim(p_contract_end_answer), '');
  v_spend text := nullif(pg_catalog.btrim(p_monthly_spend_answer), '');
  v_notes text;
begin
  if pg_catalog.char_length(p_contract_end_answer) > 200
     or pg_catalog.char_length(p_monthly_spend_answer) > 200
     or p_contract_end_answer ~ '[[:cntrl:]]'
     or p_monthly_spend_answer ~ '[[:cntrl:]]' then
    return query select 'rejected'::text, null::bigint, false; return;
  end if;
  select * into v_receipt from public.ingest_meta_lead_with_acknowledgement(
    p_page_id, p_form_id, p_external_lead_id, p_provider_created_at,
    p_company_name, p_contact_name, p_telephone, p_email, p_campaign_id
  );
  if v_receipt.outcome = 'accepted' and (v_contract is not null or v_spend is not null) then
    v_notes := 'Meta enquiry answers' ||
      case when v_contract is not null then E'\nContract end: ' || v_contract else '' end ||
      case when v_spend is not null then E'\nMonthly energy spend: ' || v_spend else '' end;
    update public.leads l set notes = v_notes
      where l.id = v_receipt.lead_id and l.notes is null;
    if not found then
      -- Roll back the entire receipt/reservation instead of losing the answers
      -- or overwriting notes that another trusted path has already supplied.
      raise exception 'Meta qualification persistence unavailable';
    end if;
  end if;
  -- Duplicates never overwrite notes or backfill historical leads. No answers
  -- are copied into audit metadata, logs, dates, scores or permission evidence.
  return query select v_receipt.outcome::text, v_receipt.lead_id::bigint,
    v_receipt.acknowledgement_reserved::boolean;
end;
$$;
revoke all on function public.ingest_meta_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text,text,text,text)
  from public, anon, authenticated, service_role, execution_dispatch_worker;
grant execute on function public.ingest_meta_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text,text,text,text)
  to external_lead_ingestor;

-- Recovery: disable the form receiver, restore its prior nine-argument build,
-- then revoke this overload's grant. Retain already received notes and audit
-- history. Apply only to the explicitly approved staging project after review.
