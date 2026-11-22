// Only imported after the parent fixture verifies kernel TCP denial.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {createCommittedPostgresStore} from '../../../source/committed-postgres-store.ts';
import {loadLeadsFixture} from '../../../tests/ui/load-leads-fixture.mjs';
import {verifyLeadFormRoutes} from './lead-form-routes.fixture.mjs';
import {loadDetailFixture} from './lead-detail.fixture.mjs';
import {privateTestSocket} from './private-test-socket.mjs';

const repo = new URL('../../../../../../', import.meta.url);
const read = url => readFileSync(url, 'utf8');

export async function startCrm(mysqlSocket, postgres, requirePinned) {
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
    // Inspect catalog permissions on a connection opened as the ingestion login.
    // A SET ROLE on an administrative session has a different rollback boundary.
    async function inspectAccess(tx) {
      const [row] = await tx`select session_user as login, current_user as effective,
        has_function_privilege('public.ingest_website_enquiry(jsonb)', 'execute') as ingest,
        exists (
          select 1 from pg_catalog.pg_proc p
          join pg_catalog.pg_namespace n on n.oid = p.pronamespace
          where n.nspname <> 'information_schema' and n.nspname !~ '^pg_'
            and p.prosecdef and p.prokind in ('f', 'p')
            and p.oid <> 'public.ingest_website_enquiry(jsonb)'::regprocedure
            and has_schema_privilege(n.oid, 'usage') and has_function_privilege(p.oid, 'execute')
        ) as other_definer,
        exists (
          select 1 from (values ('public.leads'), ('public.website_enquiry_receipts'), ('public.audit_log')) t(name)
          where has_table_privilege(t.name,'select,insert,update,delete,truncate,references,trigger')
             or has_any_column_privilege(t.name,'select,insert,update,references')
        ) as direct_access`;
      return {...row};
    }
    const expectedAccess = {login:'fixture_ingestor', effective:'fixture_ingestor', ingest:true,
      other_definer:false, direct_access:false};
    const ingestor = open('fixture_ingestor');
    try {
      assert.deepEqual(await ingestor.begin('read only', inspectAccess), expectedAccess);
    } finally {
      await ingestor.end();
    }
    await admin.begin('read only', async tx => {
      const elevated = await inspectAccess(tx);
      assert.equal(elevated.other_definer, true);
      assert.equal(elevated.direct_access, true);
      await tx`set local role fixture_ingestor`;
      assert.deepEqual(await inspectAccess(tx), {...expectedAccess, login:'postgres'});
    });
    console.log('# Restricted login verified; administrative login remains distinguishable after SET ROLE');
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
    const columns = page.match(/const LEAD_COLUMNS\s*=\s*"(id, route_id:id::text, [a-z_, ]+)"/)?.[1];
    assert(columns && page.includes('.select(LEAD_COLUMNS)'));
    // The CRM receives Supabase JSON. Let PostgreSQL encode dates and numeric IDs
    // before the native driver's timestamp decoder can turn them into JS Dates.
    async function listLeads(tx) {
      const records = await tx.unsafe('select row_to_json(visible) as lead from (select ' +
        columns.replace('route_id:id::text', 'id::text as route_id') + ' from public.leads) visible order by visible.created_at desc');
      return records.map(record => record.lead);
    }
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

    const {client, loadSource} = loadLeadsFixture(requirePinned, path => read(new URL(path, repo)));
    const renderDetail = loadDetailFixture(loadSource, requirePinned);
    const React = requirePinned('react');
    const {renderToStaticMarkup} = requirePinned('react-dom/server');
    function renderList(rows, supabaseError = false) {
      return renderToStaticMarkup(React.createElement(client.LeadsPageClient, {
        crmLeads:rows, revenueViews:{}, supabaseError,
        recomputeUnscoredLeadQualifications() { assert.fail('Unexpected write action'); },
      }));
    }

    const unavailable = renderList([], true);
    assert(unavailable.includes('CRM leads could not be loaded from Supabase.'));
    assert(unavailable.includes('data-fixture-local-panel'));
    assert(!unavailable.includes('No CRM leads in Supabase yet.'));
    assert(!unavailable.includes('Show rejected leads'));

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
        const detail = await renderDetail(tx, id);
        assert.equal(typeof detail, 'string');
        for (const value of [body.businessName, body.contactName, body.email, 'Website', 'New']) {
          assert(detail.includes('>' + value + '<'), 'Missing website enquiry field on detail page');
        }
        assert(detail.includes(body.submissionId), 'Missing submission reference in rendered notes');
        for (const [field, value] of Object.entries(body.businessAnswers ?? {})) {
          assert(detail.includes('&quot;' + field + '&quot;: &quot;' + value + '&quot;'),
            'Missing business answer on CRM detail page: ' + field);
        }
        assert(/&quot;smsConsentAnswer&quot;:\s*null/.test(detail), 'Unanswered consent missing from notes');
        assert.equal(await renderDetail(tx, '2147483647'), null, 'Absent synthetic ID must call notFound');
        return listLeads(tx);
      });
      const matches = rows.filter(row => JSON.parse(row.notes).websiteSubmissionId === body.submissionId);
      assert.equal(matches.length, 1);
      const [lead] = matches;
      assert.equal(typeof lead.created_at, 'string');
      assert.equal(typeof lead.id, 'number');
      assert.equal(lead.route_id, id);
      assert.equal(lead.company_name, body.businessName);
      assert.equal(lead.contact_name, body.contactName);
      assert.equal(lead.email, body.email);
      assert.equal(lead.lead_source, 'Website');
      if (body.businessAnswers) assert.deepEqual(JSON.parse(lead.notes).businessAnswers, body.businessAnswers);
      assert.equal(lead.status, 'New');
      assert.equal(JSON.parse(lead.notes).smsConsentAnswer, null);
      const renderedRows = renderList(rows).match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? [];
      const linkedRows = renderedRows.filter(row => row.includes(`href="/leads/${id}"`));
      assert.equal(linkedRows.length, 1);
      for (const value of [body.businessName, body.contactName, 'Website', 'New']) {
        assert(linkedRows[0].includes('>' + value + '<'), 'Unexpected contents of linked CRM row');
      }
      await admin.begin('read only', async tx => {
        await tx`set local role anon`;
        await verifyAccess(tx, 'anon', null);
        assert.equal(await renderDetail(tx, id), null, 'Anonymous role must not see the known lead ID');
        const anonymousRows = await listLeads(tx);
        assert.equal(anonymousRows.length, 0);
        const html = renderList(anonymousRows);
        assert(html.includes('No CRM leads in Supabase yet.'));
        assert.doesNotMatch(html, /href="\/leads\/\d+"/);
      });
      const audits = await admin`select entity_id from public.audit_log where correlation_id=${body.submissionId} and action='website_enquiry_received'`;
      assert.equal(audits.length, 1);
      assert.equal(audits[0].entity_id, id);
      console.log('# CRM detail rendered correlated website fields; missing ID and anonymous known-ID reads reached notFound');
      return id;
    }
    // Fixture-only inspection. Keep both the payload and digest inside the comparison.
    async function inspectReceipt(payload) {
      return admin.begin('read only', async tx => {
        const rows = await tx`select
          r.payload_sha256 = encode(sha256(convert_to(${tx.json(payload)}::jsonb::text, 'UTF8')), 'hex') as matches,
          exists (select 1 from public.leads l where l.id = r.lead_id
            and l.notes::jsonb->>'websiteSubmissionId' = r.submission_id::text) as linked,
          (select count(*)::int from public.audit_log a where a.action = 'website_enquiry_received'
            and a.correlation_id = r.submission_id and a.entity_id = r.lead_id::text) as audits
          from public.website_enquiry_receipts r where r.submission_id = ${payload.submissionId}::uuid`;
        assert(rows.length <= 1);
        return rows.length ? {...rows[0]} : null;
      });
    }
    async function verifyAbsent(submissionId) {
      const [counts] = await admin`select
        (select count(*)::int from public.website_enquiry_receipts where submission_id=${submissionId}) as receipts,
        (select count(*)::int from public.leads where notes::jsonb->>'websiteSubmissionId'=${submissionId}) as leads,
        (select count(*)::int from public.audit_log where correlation_id=${submissionId} and action='website_enquiry_received') as audits`;
      assert.deepEqual({...counts}, {receipts:0, leads:0, audits:0});
    }
    async function verifyPostgrest(binary) {
      await verifyLeadFormRoutes(loadSource, requirePinned);
      const ids = ['9007199254740992', '9007199254740993', '9223372036854775807'];
      for (const [i, id] of ids.entries()) {
        await admin`select setval(pg_get_serial_sequence('public.leads','id'), ${id}::bigint, false)`;
        const submissionId = '00000000-0000-4000-8000-00000000092' + i;
        const receipt = await save({
          submissionId, submittedAt:'2030-01-01T00:00:00.000Z', businessName:'REST fixture ' + id,
          contactName:'Synthetic contact', email:'fixture@example.invalid', phone:null, meterNumbers:null,
          currentSupplier:null, message:null, smsConsent:null, sourcePage:null,
          attribution:{utmSource:null, utmMedium:null, utmCampaign:null, utmContent:null, utmTerm:null, gclid:null, fbclid:null},
        });
        assert.deepEqual(receipt, {version:1, submissionId, outcome:'created', leadId:id});
      }
      await admin.begin('read only', async tx => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub', ${readerId}, true)`;
        const list = renderList(await listLeads(tx));
        for (const [index, id] of ids.entries()) {
          const matching = (list.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? [])
            .filter(row => row.includes(`href="/leads/${id}"`));
          assert.equal(matching.length, 1);
          assert(matching[0].includes(`>REST fixture ${id}<`));
          const detail = await renderDetail(tx, id);
          assert(detail.includes(`>REST fixture ${id}<`));
          assert(detail.includes('00000000-0000-4000-8000-00000000092' + index));
          assert(detail.includes('read-only mode'));
          assert.doesNotMatch(detail, /<form\b/);
        }
        assert.equal(await renderDetail(tx, '9007199254740994'), null);
      });
      await admin.begin('read only', async tx => {
        await tx`set local role anon`;
        for (const id of ids) assert.equal(await renderDetail(tx, id), null);
      });
      console.log('# CRM list links and read-only detail pages retain all three exact receipt IDs');
      execFileSync('/usr/bin/python3', ['verify-postgrest.py', binary, directory, ...ids],
        {env:{}, timeout:40000, stdio:'inherit'});
    }
    return {save, inspectReceipt, verifyLead, verifyAbsent, verifyPostgrest, close};
  } catch (error) { await close(); throw error; }
}
