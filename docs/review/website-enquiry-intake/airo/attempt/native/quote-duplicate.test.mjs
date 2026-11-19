// Synthetic only. Execute inside run-disposable-mysql.sh and its Unix-only sandbox.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import net from 'node:net';
import { pathToFileURL } from 'node:url';
import { privateTestSocket } from './private-test-socket.mjs';

const socketPath = privateTestSocket(process.argv[3]);
await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', error => error.code === 'EPERM' ? resolve() : reject(error));
  server.listen(0, '127.0.0.1', () => server.close(() => reject(Error('TCP guard missing'))));
});
console.log('ok 1 - kernel denies TCP');

const requirePinned = createRequire(process.argv[2]);
const mysql = requirePinned(process.argv[2]);
const url = path => new URL(path, import.meta.url).href;
const stub = code => 'data:text/javascript,' + encodeURIComponent(code);
const aliases = new Map([
  ['@/server/email.js', stub('export const sendEmail = message => globalThis.recordEmail(message)')],
  ['@/lib/phone.js', stub('export const TEL1="SYNTHETIC", TEL1_HREF="tel:synthetic"')],
  ['@/server/lib/quote-crm-step.js', url('../handoff.ts')],
  ['@/server/lib/enquiry-store.js', url('./enquiry-store.candidate.ts')],
  ['../db/schema.js', url('./enquiries-schema.ts')],
  ['../db/client.js', stub('export const db = globalThis.fixtureDb')],
]);
for (const name of ['drizzle-orm', 'drizzle-orm/mysql-core', 'drizzle-orm/mysql2']) {
  aliases.set(name, pathToFileURL(requirePinned.resolve(name).replace(/\.cjs$/, '.js')).href);
}
registerHooks({resolve(name, context, next) {
  if (aliases.has(name)) return {url: aliases.get(name), shortCircuit: true};
  if (name.startsWith('@/') || name.startsWith('../db/')) throw Error('Unexpected application dependency');
  return next(name, context);
}});

const owner = 'owner@example.invalid';
const visitor = 'visitor@example.invalid';
const database = 'synthetic_quote_duplicate';
const admin = await mysql.createConnection({socketPath, user:'root'});
let pool;
let fetches = 0;
globalThis.fetch = () => { fetches++; throw Error('Unexpected transport'); };
try {
  const [[settings]] = await admin.query('SELECT @@skip_networking AS closed');
  assert.equal(settings.closed, 1);
  await admin.query('CREATE DATABASE synthetic_quote_duplicate');
  await admin.query('USE synthetic_quote_duplicate');
  await admin.query(readFileSync(new URL('./full-enquiries.fixture.sql', import.meta.url), 'utf8'));
  pool = mysql.createPool({socketPath, user:'root', database, connectionLimit:3});
  const {drizzle} = await import('drizzle-orm/mysql2');
  const schema = await import('./enquiries-schema.ts');
  globalThis.fixtureDb = drizzle(pool, {schema, mode:'default'});
  process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;
  const handler = (await import('./quote-held.ts')).default;

  async function invoke(body) {
    const res = {status(code) {this.code = code; return this;}, json(value) {this.body = value;}};
    await handler({body}, res);
    return {code:res.code, ...res.body};
  }

  for (const [index, pauseAt] of [owner, visitor].entries()) {
    const submissionId = '00000000-0000-4000-8000-00000000080' + index;
    const body = {submissionId, email:visitor, businessName:'Original fixture', contactName:'Synthetic contact'};
    const entered = Promise.withResolvers();
    const release = Promise.withResolvers();
    const messages = [];
    globalThis.recordEmail = async message => {
      messages.push(message.to);
      if (message.to === pauseAt) { entered.resolve(); await release.promise; }
    };
    const first = invoke(body);
    try {
      await Promise.race([entered.promise, first.then(() => { throw Error('First request exited before email barrier'); })]);
      const duplicate = await invoke({...body, businessName:'Changed duplicate', email:'other@example.invalid'});
      assert.deepEqual(duplicate, {code:201, ok:true, submissionId, created:false});
      const [during] = await admin.execute('SELECT owner_email_status, visitor_email_status FROM enquiries WHERE submission_id=?', [submissionId]);
      assert.deepEqual(during, [{owner_email_status:pauseAt === owner ? 'pending' : 'sent', visitor_email_status:'pending'}]);
    } finally { release.resolve(); await first; }
    assert.deepEqual(await first, {code:201, ok:true, submissionId, created:true});
    assert.deepEqual(messages, [owner, visitor]);
    const [rows] = await admin.execute('SELECT business_name, email, sms_consent, owner_email_status, visitor_email_status, crm_status FROM enquiries WHERE submission_id=?', [submissionId]);
    assert.deepEqual(rows, [{business_name:body.businessName, email:visitor, sms_consent:null,
      owner_email_status:'sent', visitor_email_status:'sent', crm_status:'pending'}]);
    assert.equal(fetches, 0);
    console.log('ok ' + (index + 2) + ' - duplicate held during ' + (index === 0 ? 'owner' : 'visitor') + ' mock email');
  }
  console.log('1..3');
} finally {
  if (pool) await pool.end();
  await admin.end();
}
