-- Run in a read-only transaction on the session being assessed.
-- Compare with the native recovery fixture. Return only configuration booleans.
select
  not pg_catalog.pg_is_in_recovery() as primary_server,
  pg_catalog.current_setting('fsync') = 'on' as fsync_on,
  pg_catalog.current_setting('full_page_writes') = 'on' as full_page_writes_on,
  pg_catalog.current_setting('synchronous_commit') = 'on' as same_commit_mode,
  (
    select count(*) = 3
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('leads', 'website_enquiry_receipts', 'audit_log')
      and c.relkind = 'r' and c.relpersistence = 'p'
  ) as three_permanent_tables;
