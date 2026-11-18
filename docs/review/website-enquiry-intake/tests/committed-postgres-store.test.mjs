import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {Socket} from 'node:net';
import {createCommittedPostgresStore} from '../source/committed-postgres-store.ts';
import {createReceiver} from '../source/receiver.ts';
import {deliver} from '../source/client.ts';

let fetches = 0;
globalThis.fetch = () => { fetches++; throw Error('network forbidden'); };
const privateError = 'SYNTHETIC_PRIVATE_DRIVER_ERROR';
const payload = (id = '1') => ({
  submissionId: `00000000-0000-4000-8000-${id.padStart(12, '0')}`,
  submittedAt: '2030-01-01T00:00:00.000Z', businessName: 'Synthetic business',
  contactName: 'Synthetic person', email: 'test@example.invalid', phone: null,
  meterNumbers: null, currentSupplier: null, message: null, smsConsent: null,
  sourcePage: null, attribution: {utmSource: null, utmMedium: null, utmCampaign: null,
    utmContent: null, utmTerm: null, gclid: null, fbclid: null},
});
const receipt = p => ({version: 1, submissionId: p.submissionId, outcome: 'created', leadId: '133'});
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
function session(options = {}) {
  const calls = []; let ends = 0;
  return {calls, get ends() { return ends; }, async query(sql, values) {
    calls.push(sql);
    if (options.fail === sql || (options.fail === 'SELECT' && sql.startsWith('select'))) throw Error(privateError);
    if (sql === 'BEGIN') return {command: options.beginTag ?? 'BEGIN', rows: []};
    if (sql === 'COMMIT') {
      options.atCommit?.resolve();
      if (options.commitGate) await options.commitGate.promise;
      return {command: options.commitTag ?? 'COMMIT', rows: []};
    }
    assert.equal(sql, 'select public.ingest_website_enquiry($1::jsonb) as receipt');
    assert.equal(values.length, 1);
    const p = JSON.parse(values[0]);
    assert.equal(p.smsConsent, null);
    return {command: 'SELECT', rows: [{receipt: options.result ?? receipt(p)}]};
  }, async end() { ends++; if (options.endFail) throw Error(privateError); }};
}
const now = () => Date.parse('2030-01-01T00:00:00.000Z');
const endpoint = 'https://crm.example.invalid/api/website-enquiries';
const key = 'SYNTHETIC_ONLY_COMMIT_FIXTURE_133';
function journey(openFresh) {
  const receiver = createReceiver({key, now, save: createCommittedPostgresStore(openFresh)});
  let transports = 0;
  return {get transports() {return transports;}, send: p => deliver(p, {
    key, now, endpoint, approvedEndpoint: endpoint,
    transport: async (url, init) => {transports++; return receiver(new Request(url, init));},
  })};
}

test('kernel network isolation is enforced', async () => {
  const socket = new Socket();
  const error = await new Promise(resolve => {
    socket.once('error', resolve); socket.connect({host: '127.0.0.1', port: 9});
  });
  socket.destroy(); assert.equal(error.code, 'EPERM');
});

test('signed receipt is withheld until COMMIT acknowledgement, then session closes', async () => {
  const atCommit = defer(), commitGate = defer();
  const c = session({atCommit, commitGate}); const j = journey(async () => c);
  let settled = false;
  const pending = j.send(payload()).then(r => {settled = true; return r;});
  await atCommit.promise; await new Promise(r => setImmediate(r));
  assert.equal(settled, false); assert.equal(c.ends, 0);
  commitGate.resolve(); const r = await pending;
  assert.equal(r.ok, true); assert.equal(r.httpStatus, 201);
  assert.equal(c.ends, 1); assert.equal(j.transports, 1);
});

for (const [label, options, count] of [
  ['BEGIN rejection', {fail: 'BEGIN'}, 1],
  ['unexpected BEGIN tag', {beginTag: 'ROLLBACK'}, 1],
  ['SELECT rejection', {fail: 'SELECT'}, 2],
  ['lost COMMIT acknowledgement', {fail: 'COMMIT'}, 3],
  ['COMMIT reports ROLLBACK', {commitTag: 'ROLLBACK'}, 3],
  ['physical close failure after commit', {endFail: true}, 3],
  ['malformed committed receipt', {result: {version: 1}}, 3],
]) test(`${label}: uncertain response, one attempt, redacted error`, async () => {
  const c = session(options); const j = journey(async () => c);
  const r = await j.send(payload());
  assert.equal(r.ok, false); assert.equal(r.uncertain, true); assert.equal(r.httpStatus, 503);
  assert.equal(c.calls.length, count); assert.equal(c.ends, 1); assert.equal(j.transports, 1);
  assert.equal(JSON.stringify(r).includes(privateError), false);
});

test('opener rejection never issues SQL or exposes private error', async () => {
  let opens = 0;
  const j = journey(async () => {opens++; throw Error(privateError);});
  const r = await j.send(payload());
  assert.equal(r.ok, false); assert.equal(r.uncertain, true);
  assert.equal(opens, 1); assert.equal(j.transports, 1);
  assert.equal(JSON.stringify(r).includes(privateError), false);
});

test('same handle across factories is rejected without disturbing its active owner', async () => {
  const atCommit = defer(), commitGate = defer();
  const c = session({atCommit, commitGate});
  const first = createCommittedPostgresStore(async () => c);
  const second = createCommittedPostgresStore(async () => c);
  const pending = first(payload()); await atCommit.promise;
  await assert.rejects(second(payload('2')), {message: 'CRM persistence unavailable'});
  assert.equal(c.calls.length, 3); assert.equal(c.ends, 0);
  commitGate.resolve(); assert.equal((await pending).outcome, 'created');
  assert.equal(c.ends, 1);
  await assert.rejects(first(payload('3')), {message: 'CRM persistence unavailable'});
  assert.equal(c.ends, 1); assert.equal(c.calls.length, 3);
});

test('different sessions progress independently while first commit is paused', async () => {
  const atCommit = defer(), commitGate = defer();
  const first = session({atCommit, commitGate}), second = session();
  const sessions = [first, second]; const store = createCommittedPostgresStore(async () => sessions.shift());
  const pending = store(payload()); await atCommit.promise;
  assert.equal((await store(payload('2'))).submissionId, payload('2').submissionId);
  assert.equal(first.ends, 0); assert.equal(second.ends, 1);
  commitGate.resolve(); await pending; assert.equal(first.ends, 1);
});

test('committed duplicate and conflict use existing receipt validation unchanged', async () => {
  for (const result of [{...receipt(payload()), outcome: 'duplicate'}, {outcome: 'conflict'}]) {
    const c = session({result}); const store = createCommittedPostgresStore(async () => c);
    assert.deepEqual(await store(payload()), result);
    assert.equal(c.calls.at(-1), 'COMMIT'); assert.equal(c.ends, 1);
  }
});
after(() => assert.equal(fetches, 0));
