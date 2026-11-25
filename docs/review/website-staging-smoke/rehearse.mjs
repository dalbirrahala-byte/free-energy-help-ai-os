import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { pathToFileURL } from 'node:url';
import { deliver } from '../website-enquiry-intake/source/client.ts';
import { createReceiver } from '../website-enquiry-intake/source/receiver.ts';

assert.deepEqual(Object.keys(process.env), []);
for (const host of ['127.0.0.1', '::1']) {
  await assert.rejects(new Promise((resolve, reject) => {
    const socket = connect(9, host);
    socket.once('error', reject);
    socket.once('connect', () => { socket.destroy(); resolve(); });
  }), { code: 'EPERM' });
}
let externalCalls = 0;
globalThis.fetch = () => { externalCalls++; throw Error('External fetch disabled'); };
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const payload = JSON.parse(read('./enquiry.json'));
const db = await PGlite.create();
const endpoint = 'https://fixture.invalid/api/website-enquiries';
const key = 'local-fictional-signature-for-rehearsal-only';
const time = () => Date.parse(payload.submittedAt);
let calls = 0;
let receipt;
try {
  // The database exists only inside this process. Reuse the archive's synthetic base tables.
  const fixture = read('../website-enquiry-intake/tests/postgres-local.sql');
  const start = fixture.indexOf('DO $$ BEGIN\n IF NOT EXISTS');
  const end = fixture.indexOf('\\ir');
  assert.ok(start > 0 && end > start);
  await db.exec(fixture.slice(start, end));
  await db.exec(read('../website-enquiry-intake/source/website-enquiries.sql'));
  const before = await db.query('select count(*)::int as n from public.website_enquiry_receipts where submission_id=$1', [payload.submissionId]);
  assert.equal(before.rows[0].n, 0);
  const receive = createReceiver({ key, now: time, async save(body) {
    const saved = await db.query('select public.ingest_website_enquiry($1) as receipt', [body]);
    return saved.rows[0].receipt;
  } });
  const result = await deliver(payload, { endpoint, approvedEndpoint: endpoint, key, now: time,
    async transport(url, init) {
      assert.equal(++calls, 1);
      const response = await receive(new Request(url, init));
      receipt = await response.clone().json();
      return response;
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.simulated, false);
  assert.equal(result.httpStatus, 201);
  assert.equal(receipt.submissionId, payload.submissionId);
  assert.equal(receipt.outcome, 'created');
  await db.exec('begin read only');
  const matched = await db.query(`
    select r.lead_id::text as id, r.payload_sha256 = encode(sha256(convert_to($2::jsonb::text, 'UTF8')), 'hex') as exact,
      l.lead_source='Website' and l.status='New' and l.company_name=$3 and l.contact_name=$4
      and l.notes::jsonb->>'websiteSubmissionId'=r.submission_id::text
      and l.notes::jsonb->'businessAnswers'=$5::jsonb and l.notes::jsonb->'smsConsentAnswer'='null'::jsonb
      and l.consent_given is false and l.telephone is null as fields,
      (select count(*)::int from public.audit_log a where a.correlation_id=r.submission_id
        and a.action='website_enquiry_received' and a.result='success' and a.entity_type='lead'
        and a.entity_id=l.id::text and a.metadata->>'source'='feh-airo-website'
        and a.metadata->>'submission_id'=r.submission_id::text) as audits
    from public.website_enquiry_receipts r join public.leads l on l.id=r.lead_id where r.submission_id=$1
  `, [payload.submissionId, payload, payload.businessName, payload.contactName, payload.businessAnswers]);
  assert.deepEqual(matched.rows, [{ id: receipt.leadId, exact: true, fields: true, audits: 1 }]);
  await db.exec('commit');
  assert.equal(calls, 1);
  assert.equal(externalCalls, 0);
  console.log('PASS local only: one signed request, matching committed receipt, one lead, four answers, one audit, zero external calls');
} finally {
  await db.close();
}
