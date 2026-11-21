-- Fixture query. Bind one previously known submission UUID in a read-only transaction.
-- Reports visible relational evidence only. Access errors must propagate to the caller.
select case when exists (
  select 1
  from public.website_enquiry_receipts r
  join public.leads l on l.id = r.lead_id
  where r.submission_id = $1::uuid and l.lead_source = 'Website'
    and (
      select count(*) = 1 and bool_and(
        a.entity_type = 'lead' and a.entity_id = l.id::text and a.result = 'success'
        and a.metadata->>'source' = 'feh-airo-website'
        and a.metadata->>'submission_id' = r.submission_id::text
      ) from public.audit_log a
      where a.correlation_id = r.submission_id and a.action = 'website_enquiry_received'
    )
) then 'correlated' else 'unconfirmed' end as receipt_status;
