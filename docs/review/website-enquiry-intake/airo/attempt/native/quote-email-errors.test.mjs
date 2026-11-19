// Run with tests/deny-network.py. No runtime database or provider adapter is loaded.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import net from 'node:net';
import { test } from 'node:test';

const modules = new Map([
  ['@/lib/phone.js', 'export const TEL1="fixture", TEL1_HREF="tel:fixture"'],
  ['@/server/email.js', 'export const sendEmail = m => globalThis.fixture.email(m)'],
  ['@/server/lib/quote-crm-step.js', 'export const finishQuoteCrm = (...args) => globalThis.fixture.crm(...args)'],
  ['@/server/lib/enquiry-store.js', `
    export const saveEnquiry = input => globalThis.fixture.save(input);
    export const updateDeliveryStatus = (...args) => globalThis.fixture.update(...args);
    export const enquiryRowToCrmPayload = () => { throw Error('Dormant CRM mapped a payload'); };
  `],
]);
registerHooks({resolve(name, context, next) {
  if (modules.has(name)) return {shortCircuit:true, url:'data:text/javascript,' + encodeURIComponent(modules.get(name))};
  if (name.startsWith('@/')) throw Error('Unexpected application dependency');
  return next(name, context);
}});
await new Promise((resolve,reject) => {
  const socket = net.connect(9, '127.0.0.1');
  socket.once('error', error => error.code === 'EPERM' ? resolve() : reject(error));
  socket.once('connect', () => { socket.destroy(); reject(Error('Missing kernel network guard')); });
});
const handler = (await import('./quote-held.ts')).default;
const owner = 'owner@example.invalid';
const visitor = 'visitor@example.invalid';
process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;

for (const [index, recipient] of [owner, visitor].entries()) {
  const ownerFailed = recipient === owner;
  test((ownerFailed ? 'owner' : 'visitor') + ' email error keeps diagnostics private and preserves delivery order', async t => {
    const submissionId = '00000000-0000-4000-8000-00000000985' + index;
    const calls = [], logs = [];
    for (const level of ['log', 'warn', 'error']) t.mock.method(console, level, (...args) => logs.push([level, ...args]));
    let fetches = 0;
    t.mock.method(globalThis, 'fetch', () => { fetches++; throw Error('Unexpected fetch'); });
    globalThis.fixture = {
      save(input) {
        calls.push(['save', input.submissionId]);
        return {ok:true, created:true, row:{...input, ownerEmailStatus:'pending', visitorEmailStatus:'pending', crmStatus:'pending'}};
      },
      email(message) {
        calls.push(['email', message.to]);
        if (message.to === recipient) {
          const diagnostic = 'SYNTHETIC_PRIVATE_MAIL_DETAIL ' + recipient;
          throw ownerFailed ? new Error(diagnostic) : diagnostic;
        }
      },
      update(id, column, status) { calls.push(['update', id, column, status]); },
      crm(id, isNew, status) { calls.push(['crm', id, isNew, status]); return 'disabled'; },
    };
    t.after(() => { delete globalThis.fixture; });
    const res = {status(code) { this.code = code; return this; }, json(body) { this.body = body; }};
    await handler({body:{submissionId, businessName:'Fixture business', contactName:'Fixture contact', email:visitor}}, res);
    assert.deepEqual(calls, [
      ['save', submissionId], ['email', owner], ['update', submissionId, 'ownerEmailStatus', ownerFailed ? 'failed' : 'sent'],
      ...(ownerFailed ? [] : [['email', visitor], ['update', submissionId, 'visitorEmailStatus', 'failed'], ['crm', submissionId, true, 'pending']]),
    ]);
    assert.equal(res.code, ownerFailed ? 500 : 201);
    assert.deepEqual(res.body, ownerFailed ? {error:'Failed to send — please try again or call us directly.'} : {ok:true, submissionId, created:true});
    assert.equal(fetches, 0);
    assert.doesNotMatch(JSON.stringify([logs,res.body]), /SYNTHETIC_PRIVATE_MAIL_DETAIL|example\.invalid|Fixture business|Fixture contact/);
    const failureLogs = logs.filter(([level]) => level === 'warn' || level === 'error');
    assert.deepEqual(failureLogs, [[ownerFailed ? 'error' : 'warn',
      ownerFailed ? 'quote.submit.owner_email_failed' : 'quote.submit.visitor_email_failed', {submissionId}]]);
  });
}
