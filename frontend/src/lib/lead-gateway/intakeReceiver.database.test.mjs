import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('receiver migration adds one expiring intake-only identity without memberships',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create table public.leads(id bigint);create table public.lead_acknowledgements(id bigint);
 create function public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text) returns text language sql as 'select ''accepted''::text';
 create function public.claim_meta_lead_acknowledgement() returns text language sql as 'select ''blocked''::text';
 revoke execute on all functions in schema public from public;`);
 await db.exec(await readFile(new URL('../../../../supabase/migrations/20261101182034_restricted_staging_intake_receiver.sql',import.meta.url),'utf8'));
 const {rows}=await db.query(`select rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit,rolconnlimit,rolvaliduntil,
 has_function_privilege(rolname,'public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text)','execute') intake,
 has_function_privilege(rolname,'public.claim_meta_lead_acknowledgement()','execute') worker,
 has_table_privilege(rolname,'public.leads','select,insert,update,delete,truncate') raw_leads,
 has_table_privilege(rolname,'public.lead_acknowledgements','select,insert,update,delete,truncate') raw_queue,
 (select count(*)::int from pg_auth_members where member=pg_roles.oid) memberships
 from pg_roles where rolname='feh_intake_preview_receiver'`);
 assert.equal(rows.length,1);const r=rows[0];
 for(const name of ['rolcanlogin','rolsuper','rolbypassrls','rolcreaterole','rolcreatedb','rolinherit','worker','raw_leads','raw_queue'])assert.equal(r[name],false,name);
 assert.equal(r.intake,true);assert.equal(r.memberships,0);assert.equal(r.rolconnlimit,2);
 assert.equal(new Date(r.rolvaliduntil).toISOString(),'2026-11-06T23:59:59.000Z');
 }finally{await db.close();}
});
