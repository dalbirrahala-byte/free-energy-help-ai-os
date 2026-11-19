// Local engineering fixture only; no website submission, credentials or runtime imports.
// Run under tests/deny-network.py. Arguments: dependency root, source root, migration root.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { loadLeadsFixture } from './load-leads-fixture.mjs';
import net from 'node:net';

const [dependencyRoot, sourceRoot, migrationRoot] = process.argv.slice(2).map(p => resolve(p));
assert.ok(dependencyRoot && sourceRoot && migrationRoot);
const requireDependency = createRequire(join(dependencyRoot, 'package.json'));
const { renderToStaticMarkup } = requireDependency('react-dom/server');
const { PGlite } = requireDependency('@electric-sql/pglite');
const provenance = JSON.parse(readFileSync(new URL('./provenance.json', import.meta.url), 'utf8'));
const files = new Map();
for (const entry of [...provenance.files, ...provenance.migrations]) {
  const b = readFileSync(join(entry.path.startsWith('supabase/') ? migrationRoot : sourceRoot, entry.path));
  assert.equal(createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'), entry.sha, entry.path);
  files.set(entry.path, b.toString('utf8'));
}
assert.equal(provenance.migrations.length, 63);
let fetches = 0;
globalThis.fetch = () => { fetches++; throw Error('HTTP forbidden'); };
let passed = 0;
function pass(label) { console.log(`ok ${++passed} - ${label}`); }
console.log('TAP version 13');
await new Promise((resolve, reject) => {
  const s = net.createConnection({ host: '127.0.0.1', port: 9 });
  s.once('connect', () => { s.destroy(); reject(Error('network isolation absent')); });
  s.once('error', e => { try { assert.equal(e.code, 'EPERM'); resolve(); } catch (x) { reject(x); } });
});
pass('kernel rejects TCP creation; all 67 input Git blobs verified');

const forbidden = () => { throw Error('unexpected action'); };
const jsx = requireDependency('react/jsx-runtime');
const { client, loadSource, emptyPanelCalls } = loadLeadsFixture(requireDependency, path => files.get(path));
let failRead = false, selections = 0, revenueReads = 0;
const db = new PGlite();
const server = loadSource('frontend/src/app/leads/page.tsx', {
  'react/jsx-runtime': jsx,
  'next/cache': { revalidatePath: forbidden }, 'next/navigation': { redirect: forbidden },
  '@/lib/auth/enforceWrite': { requireOperationalPermission: forbidden },
  '@/components/leads/LeadsPageClient': client,
  '@/lib/revenue-engine/loadLeadRevenueViews': { loadLeadRevenueViews: async () => { revenueReads++; return {}; } },
  '@/lib/revenue-engine/syncAllLeadQualifications': { syncAllLeadQualifications: forbidden },
  '@/lib/supabase/server': { createClient: async () => ({ from(table) {
    assert.equal(table, 'leads');
    return { select(columns) {
      assert.match(columns, /^[a-z_, ]+$/);
      return { async order(column, options) {
        assert.equal(column, 'created_at'); assert.deepEqual(options, { ascending: false });
        selections++;
        if (failRead) return { data: null, error: { message: 'synthetic read denied' } };
        return { data: (await db.query(`SELECT ${columns} FROM public.leads ORDER BY created_at DESC`)).rows, error: null };
      } };
    } };
  } }) },
});
try {
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create role anon;create role authenticated;create role service_role bypassrls;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges in schema public grant all on functions to anon,authenticated,service_role;`);
  for (const entry of provenance.migrations) await db.exec(files.get(entry.path));
  await db.exec(files.get('docs/review/website-enquiry-intake/source/website-enquiries.sql'));
  const payload = {
    submissionId: '00000000-0000-4000-8000-000000000733', submittedAt: '2030-01-01T00:00:00.000Z',
    businessName: 'Synthetic <img src=x onerror=alert(1)> business', contactName: 'Synthetic <b>contact</b>',
    email: 'synthetic@example.invalid', phone: null, currentSupplier: null, meterNumbers: null,
    message: 'Synthetic enquiry', smsConsent: null, sourcePage: null,
    attribution: { utmSource: 'synthetic', utmMedium: null, utmCampaign: null, utmContent: null,
      utmTerm: null, gclid: null, fbclid: null },
  };
  const receipt = (await db.query('select public.ingest_website_enquiry($1::jsonb) as receipt', [JSON.stringify(payload)])).rows[0].receipt;
  const row = (await db.query('select * from public.leads where id=$1', [receipt.leadId])).rows[0];
  assert.equal(receipt.outcome, 'created'); assert.equal(receipt.submissionId, payload.submissionId);
  assert.equal(row.company_name, payload.businessName); assert.equal(row.contact_name, payload.contactName);
  assert.equal(row.email, payload.email); assert.equal(row.telephone, null); assert.equal(row.consent_given, false);
  assert.equal(row.lead_source, 'Website'); assert.equal(row.status, 'New');
  assert.equal(row.qualification_classification, null); assert.equal(row.utm_source, 'synthetic');
  assert.equal(JSON.parse(row.notes).websiteSubmissionId, payload.submissionId);
  assert.equal(JSON.parse(row.notes).smsConsentAnswer, null);
  pass('actual ingestion SQL yields correlated ordinary CRM row after all migrations');

  const html = renderToStaticMarkup(await server.default());
  assert.equal(selections, 1); assert.equal(revenueReads, 1);
  assert.ok(html.includes(`href="/leads/${receipt.leadId}"`));
  assert.ok(html.includes('CRM leads (Supabase)')); assert.ok(html.includes('Website'));
  assert.ok(html.includes('New')); assert.ok(html.includes('Not yet scored')); assert.ok(html.includes('Not provided'));
  assert.deepEqual(emptyPanelCalls, [{ leads: [], newLeadCount: 0 }]);
  assert.ok(html.includes('Synthetic &lt;img src=x onerror=alert(1)&gt; business'));
  assert.ok(html.includes('Synthetic &lt;b&gt;contact&lt;/b&gt;'));
  assert.ok(!html.includes('<img src=x')); assert.ok(!html.includes('<b>contact</b>'));
  pass('actual list query and component render website row, numeric detail link, null fallbacks and escaped text');

  failRead = true;
  const failureHtml = renderToStaticMarkup(await server.default());
  assert.equal(selections, 2); assert.equal(revenueReads, 1);
  assert.ok(failureHtml.includes('CRM leads could not be loaded from Supabase'));
  assert.ok(!failureHtml.includes(`href="/leads/${receipt.leadId}"`));
  assert.ok(!failureHtml.includes('Synthetic &lt;img'));
  assert.equal(fetches, 0);
  pass('read failure displays error without a fabricated CRM row or fallback delivery');
  console.log(`1..${passed}`);
  console.log('# Local engineering only: PGlite + real list sources; mocked auth/transport/revenue/panel. No browser, RLS identity or hosted acceptance.');
} finally { await db.close(); }
