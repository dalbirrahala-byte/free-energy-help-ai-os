// Offline characterisation of the published callbacks. Supply the pinned JS asset
// as argv[2] and launch with tests/deny-network.py. No website or DB is opened.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import net from 'node:net';
import {isDeepStrictEqual} from 'node:util';
import vm from 'node:vm';
import {validPayload} from '../source/contract.ts';

await new Promise((resolve, reject) => {
  const socket = net.connect(9, '127.0.0.1');
  socket.on('connect', () => { socket.destroy(); reject(Error('Kernel socket denial required')); });
  socket.on('error', error => error.code === 'EPERM' ? resolve() : reject(error));
});
const asset = readFileSync(process.argv[2]);
assert.equal(createHash('sha256').update(asset).digest('hex'),
  '6346d0755a91d04a4ab4b99e07d92b90b5ecd3789e0922efa0adcb7809393b88');
const bundle = asset.toString('utf8');
const aliases = new Map([
  ['drizzle-orm', 'export const eq = null, sql = null'],
  ['../db/schema.js', 'export const enquiries = null'],
  ['@/lib/phone.js', 'export const TEL1 = "fixture", TEL1_HREF = "fixture"'],
  ['@/server/email.js', 'export const sendEmail = message => globalThis.fixture.email(message.to)'],
  ['@/server/lib/quote-crm-step.js', 'export const finishQuoteCrm = (...args) => globalThis.fixture.handoff(...args)'],
  ['@/server/lib/enquiry-store.js', `export const saveEnquiry = row => globalThis.fixture.save(row);
    export const updateDeliveryStatus = () => {};
    export const enquiryRowToCrmPayload = row => globalThis.fixture.map(row)`],
]);
registerHooks({resolve(name, context, next) {
  if (aliases.has(name)) return {shortCircuit:true, url:'data:text/javascript,' + encodeURIComponent(aliases.get(name))};
  if (name.startsWith('@/') || name === '../db/client.js') throw Error('Unexpected app dependency');
  return next(name, context);
}});
const {enquiryRowToCrmPayload} = await import('./attempt/native/enquiry-store.candidate.ts');
const {default:quote} = await import('./attempt/native/quote-held.ts');
globalThis.fetch = () => { throw Error('Unexpected network transport'); };
const owner = 'owner@example.invalid';
process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;
const shared = {businessName:'Synthetic', contactName:'Fixture', email:'visitor@example.invalid', phone:''};
const healthFields = {postcode:'FIXTURE', currentSupplier:'Synthetic supplier', energyType:'Synthetic energy',
  contractEnd:'Synthetic end', annualSpend:'Synthetic band', message:'Synthetic message'};
const attribution = {utmSource:'s', utmMedium:'m', utmCampaign:'c', utmContent:'o', utmTerm:'t', gclid:'g', fbclid:'f'};
const forms = [
  {component:'Hse', source:'homepage-quote-form', start:'w=async b=>', end:';return e.jsxs("section"', offset:2, submit:'w'},
  {component:'_me', source:'health-check-form', start:'async function w(b)', end:'return t?e.jsxs', submit:'w'},
  {component:'Rme', source:'resource-download-renewal-checklist', start:'async function w(b)', end:'return e.jsxs(e.Fragment', submit:'w'},
  {component:'kbe', source:'reports-hub-notify', start:'async function v(w)', end:'return e.jsxs(e.Fragment', submit:'v'},
];
function callback(form) {
  const marker = 'function ' + form.component + '(){';
  const index = bundle.indexOf(marker);
  assert.ok(index >= 0);
  const part = bundle.slice(index + marker.length);
  const start = part.indexOf(form.start), end = part.indexOf(form.end, start);
  assert.ok(start >= 0 && end > start && end < 4000);
  assert.match(part.slice(end, end + 35000), new RegExp('onSubmit:' + form.submit + ','));
  return part.slice(start + (form.offset ?? 0), end);
}
async function exercise(form, consent) {
  const events = [], bodies = [], payloads = [];
  const health = form.component === '_me';
  const home = form.component === 'Hse';
  let saved, response;
  globalThis.fixture = {
    save(input) {
      events.push('save');
      saved = {...input, ownerEmailStatus:'pending', visitorEmailStatus:'pending', crmStatus:'pending'};
      return {ok:true, created:true, row:saved};
    },
    email(to) { events.push(to === owner ? 'owner' : to === shared.email ? 'visitor' : 'unexpected recipient'); },
    map:enquiryRowToCrmPayload,
    handoff(id, created, status, getPayload) {
      events.push('crm');
      assert.equal(id, saved.submissionId);
      assert.equal(created, true);
      assert.equal(status, 'pending');
      payloads.push(getPayload());
      return 'disabled';
    },
  };
  const noop = () => {};
  const context = {
    t:home ? {...shared, currentSupplier:'', message:''} : {name:shared.contactName, org:shared.businessName, email:shared.email},
    v:{current:new Map(Object.entries({...shared, ...healthFields}))},
    FormData:Map, URLSearchParams, y:consent, K2:noop, h:noop, f:noop, s:noop, o:noop,
    window:{location:{pathname:'/business-energy-health-check',
      search:'?utm_source=s&utm_medium=m&utm_campaign=c&utm_content=o&utm_term=t&gclid=g&fbclid=f'}},
    async fetch(path, options) {
      assert.equal(path, '/api/quote');
      assert.equal(options.method, 'POST');
      bodies.push(JSON.parse(options.body));
      const res = {status(code) {this.code=code; return this;}, json(value) {this.value=value;}};
      await quote({body:bodies.at(-1)}, res);
      response = res;
      return {ok:res.code === 201};
    },
  };
  await vm.runInNewContext('(' + callback(form) + ')', context)({preventDefault:noop});
  assert.deepEqual(events, ['save','owner','visitor','crm']);
  assert.equal(bodies.length, 1);
  assert.equal(payloads.length, 1);
  const [body] = bodies, [payload] = payloads;
  assert.equal(body.source, form.source);
  assert.equal(response.code, 201);
  assert.equal(response.value.submissionId, payload.submissionId);
  assert.ok(validPayload(payload));
  assert.equal(payload.email, shared.email);
  assert.equal(payload.smsConsent, health && consent ? consent : null);
  if (health) {
    assert.deepEqual(payload.attribution, attribution);
    assert.equal(payload.sourcePage, context.window.location.pathname);
    for (const [field,value] of Object.entries(healthFields)) assert.equal(body[field], value);
    assert.equal(payload.currentSupplier, healthFields.currentSupplier);
    assert.equal(payload.message, healthFields.message);
  } else {
    assert.ok(!Object.hasOwn(body, 'smsConsent'));
    assert.ok(Object.values(payload.attribution).every(value => value === null));
  }
  // Report field loss and placeholders as observations, not acceptance criteria.
  const omitted = Object.keys(body).filter(key => !Object.hasOwn(payload,key) && !Object.hasOwn(payload.attribution,key));
  console.info('OBSERVED', form.source, 'consent', payload.smsConsent, 'omitted', omitted.join(','),
    'phone placeholder', payload.phone === 'N/A', 'has pathname', Boolean(payload.sourcePage));
  const {submissionId, submittedAt, ...content} = payload;
  return content;
}
const samples = new Map();
for (const form of forms) {
  for (const consent of form.component === '_me' ? ['no',''] : ['']) {
    samples.set(form.component, await exercise(form,consent));
  }
}
console.info('OBSERVED homepage and checklist CRM content identical (excluding UUID and time):',
  isDeepStrictEqual(samples.get('Hse'),samples.get('Rme')));
