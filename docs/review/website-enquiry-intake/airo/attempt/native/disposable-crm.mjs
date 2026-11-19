// Only imported after the parent fixture verifies kernel TCP denial.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {createCommittedPostgresStore} from '../../../source/committed-postgres-store.ts';
import {privateTestSocket} from './private-test-socket.mjs';

const repo = new URL('../../../../../../', import.meta.url);
const read = url => readFileSync(url, 'utf8');

export async function startCrm(mysqlSocket, postgres) {
  const directory = dirname(privateTestSocket(mysqlSocket));
  const data = join(directory, 'pgdata');
  mkdirSync(data, {mode:0o700});
  const versions = readdirSync('/usr/lib/postgresql').filter(entry => /^\d+$/.test(entry)).map(Number);
  assert(versions.length > 0);
  const bin = '/usr/lib/postgresql/' + Math.max(...versions) + '/bin/';
  const run = (program, args) => execFileSync(bin + program, args, {env:{PATH:'/usr/bin:/bin', LANG:'C'}, timeout:20000});
  run('initdb', ['-D', data, '-U', 'postgres', '--auth-local=trust', '--auth-host=reject', '--no-locale', '--encoding=UTF8']);
  run('pg_ctl', ['-D', data, '-l', join(directory, 'pg.log'), '-w', '-o',
    "-c listen_addresses='' -c unix_socket_directories=" + directory, 'start']);
  const open = user => postgres({host:directory, user, database:'postgres', max:1, prepare:false,
    fetch_types:false, onnotice:() => {}, connect_timeout:3});
  const admin = open('postgres');
  const close = async () => {
    try { await admin.end(); }
    finally { run('pg_ctl', ['-D', data, '-w', '-m', 'fast', 'stop']); }
  };
  try {
    const [server] = await admin`select current_setting('listen_addresses') as listen, version() as version`;
    assert.equal(server.listen, '');
    await admin.unsafe(`
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create role anon; create role authenticated; create role service_role bypassrls;
      grant usage on schema public,auth to anon,authenticated,service_role;
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
      alter default privileges in schema public grant all on functions to anon,authenticated,service_role;
    `).simple();
    const migrations = JSON.parse(read(new URL('../../../tests/native/migration-provenance.json', import.meta.url)));
    assert.equal(migrations.length, 63);
    for (const {path, sha} of migrations) {
      const source = read(new URL(path, repo));
      const hash = createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex');
      assert.equal(hash, sha, path);
      await admin.unsafe(source).simple();
    }
    await admin.unsafe(read(new URL('../../../source/website-enquiries.sql', import.meta.url))).simple();
    await admin.unsafe(`create role fixture_ingestor login;
      grant usage on schema public to fixture_ingestor;
      grant execute on function public.ingest_website_enquiry(jsonb) to fixture_ingestor;`).simple();
    const [acl] = await admin`select has_function_privilege('fixture_ingestor','public.ingest_website_enquiry(jsonb)','execute') as execute,
      has_table_privilege('fixture_ingestor','public.leads','select,insert,update,delete') as leads,
      has_table_privilege('fixture_ingestor','public.website_enquiry_receipts','select,insert,update,delete') as receipts`;
    assert.deepEqual({...acl}, {execute:true, leads:false, receipts:false});
    console.log('# Disposable CRM:', server.version, '63 migrations verified');

    const save = createCommittedPostgresStore(async () => {
      const session = open('fixture_ingestor');
      return {
        async query(sql, values = []) {
          const rows = await session.unsafe(sql, values.map(value => session.typed(value, 25)));
          return {rows, command:rows.command};
        },
        end:() => session.end(),
      };
    });
    const page = read(new URL('frontend/src/app/leads/page.tsx', repo));
    const columns = page.match(/const LEAD_COLUMNS\s*=\s*"([a-z_, ]+)"/)?.[1];
    assert(columns && page.includes('.select(LEAD_COLUMNS)'));
    const listLeads = 'select ' + columns + ' from public.leads order by created_at desc';
    const readerId = '00000000-0000-4000-8000-000000000901';
    await admin.begin(async tx => {
      await tx`insert into auth.users (id) values (${readerId})`;
      await tx`insert into public.user_roles (id, role) values (${readerId}, 'read_only')`;
    });

    // Model the database identity set by the API after authentication.
    // Each role switch and synthetic subject expires with its read-only transaction.
    async function verifyAccess(tx, expectedRole, expectedSubject) {
      const [access] = await tx`select current_user as role, auth.uid()::text as subject,
        row_security_active('public.leads') as rls,
        has_table_privilege(current_user, 'public.website_enquiry_receipts', 'select') as read_receipts,
        has_function_privilege(current_user, 'public.ingest_website_enquiry(jsonb)', 'execute') as ingest`;
      assert.deepEqual({...access}, {
        role:expectedRole, subject:expectedSubject, rls:true, read_receipts:false, ingest:false,
      });
    }

    async function verifyLead(body) {
      const receipts = await admin`select lead_id::text as id from public.website_enquiry_receipts where submission_id=${body.submissionId}`;
      assert.equal(receipts.length, 1);
      const {id} = receipts[0];
      const rows = await admin.begin('read only', async tx => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub', ${readerId}, true)`;
        await verifyAccess(tx, 'authenticated', readerId);
        const [reader] = await tx`select role, public.user_can_write() as can_write
          from public.user_roles where id = auth.uid()`;
        assert.deepEqual({...reader}, {role:'read_only', can_write:false});
        return tx.unsafe(listLeads);
      });
      const matches = rows.filter(row => JSON.parse(row.notes).websiteSubmissionId === body.submissionId);
      assert.equal(matches.length, 1);
      const [lead] = matches;
      assert.equal(String(lead.id), id);
      assert.equal(lead.company_name, body.businessName);
      assert.equal(lead.contact_name, body.contactName);
      assert.equal(lead.email, body.email);
      assert.equal(lead.lead_source, 'Website');
      assert.equal(lead.status, 'New');
      assert.equal(JSON.parse(lead.notes).smsConsentAnswer, null);
      await admin.begin('read only', async tx => {
        await tx`set local role anon`;
        await verifyAccess(tx, 'anon', null);
        const anonymousRows = await tx.unsafe(listLeads);
        assert.equal(anonymousRows.length, 0);
      });
      const audits = await admin`select entity_id from public.audit_log where correlation_id=${body.submissionId} and action='website_enquiry_received'`;
      assert.equal(audits.length, 1);
      assert.equal(audits[0].entity_id, id);
      console.log('# CRM Leads RLS: read_only matched one correlated lead; anon saw zero rows');
      return id;
    }
    return {save, verifyLead, close};
  } catch (error) { await close(); throw error; }
}
