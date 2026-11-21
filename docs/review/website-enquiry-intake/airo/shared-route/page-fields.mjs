import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {connect} from 'node:net';
import vm from 'node:vm';

await new Promise((resolve, reject) => {
  const socket = connect(9, '127.0.0.1');
  socket.once('connect', () => { socket.destroy(); reject(Error('Network isolation required')); });
  socket.once('error', error => error.code === 'EPERM' ? resolve() : reject(error));
});
const bundle = readFileSync(process.argv[2]);
assert.equal(createHash('sha256').update(bundle).digest('hex'),
  '6346d0755a91d04a4ab4b99e07d92b90b5ecd3789e0922efa0adcb7809393b88');
const source = bundle.toString();
let unexpectedCalls = 0;
function unexpected() { unexpectedCalls++; throw Error('Unexpected external or CRM operation'); }
globalThis.fetch = unexpected;
const doubles = new Map([
  ['@/lib/phone.js', 'export const TEL1="fixture", TEL1_HREF="tel:fixture"'],
  ['@/server/email.js', 'export const sendEmail = mail => globalThis.fixture.mail.push(mail.to)'],
  ['@/server/lib/quote-crm-step.js', 'export const finishQuoteCrm = () => globalThis.fetch()'],
  ['@/server/lib/enquiry-store.js', `export const saveEnquiry = (...args) => globalThis.fixture.save(...args);
    export const updateDeliveryStatus = (...args) => globalThis.fixture.status.push(args);
    export const enquiryRowToCrmPayload = () => globalThis.fetch();`],
]);
registerHooks({resolve(name, context, next) {
  if (doubles.has(name)) return {shortCircuit:true, url:'data:text/javascript,' + encodeURIComponent(doubles.get(name))};
  if (name.startsWith('@/')) throw Error('Unmocked app import ' + name);
  return next(name, context);
}});
const sharedRoute = (await import('./quote-held.ts')).default;
const owner = 'owner@example.invalid', visitor = 'visitor@example.invalid';
process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;

async function exercise(component, page, mapNames) {
  const initial = component.match(/\[o,d\]=k\.useState\((\{[^}]*\})\)/)[1];
  const state = vm.runInNewContext('(' + initial + ')');
  for (const field of ['name','company','email']) assert.ok(Object.hasOwn(state, field));
  Object.assign(state, {name:'Synthetic Contact', company:'Fixture Business', email:visitor});
  assert.match(component, /onSubmit:y\b/);
  const submit = component.match(/,y=(async f=>.*?);return e\.jsxs\(/)[1];
  const states = [], requests = [], responses = [], saved = [], mail = [], status = [];
  globalThis.fixture = {mail, status, save(input, crmStatus) {
    saved.push({input, crmStatus});
    return {ok:true, created:true, row:{...input, crmStatus, ownerEmailStatus:'pending', visitorEmailStatus:'pending'}};
  }};
  const callback = vm.runInNewContext('(' + submit + ')', {
    o:state, t:{current:null}, a:value => states.push(value), d:() => {},
    async fetch(path, options) {
      const original = JSON.parse(options.body);
      requests.push({path, method:options.method, original});
      // A paired control changes only the two client field names at the local transport boundary.
      const {name, company, ...rest} = original;
      const body = mapNames ? {...rest, contactName:name, businessName:company} : original;
      const res = {status(code) {this.code=code; return this;}, json(value) {this.body=value;}};
      await sharedRoute({body},res);
      responses.push(res);
      return {ok:res.code >= 200 && res.code < 300};
    },
  });
  await callback({preventDefault() {}});
  assert.deepEqual(requests, [{path:'/api/quote', method:'POST', original:{...state, source:page}}]);
  assert.equal(responses.length, 1);
  const [res] = responses;
  if (mapNames) {
    assert.equal(res.code,201);
    assert.deepEqual(states,['sending','sent']);
    assert.equal(saved.length,1);
    const [{input, crmStatus}] = saved;
    assert.equal(input.contactName,state.name);
    assert.equal(input.businessName,state.company);
    assert.equal(input.email,visitor);
    assert.equal(crmStatus,'excluded');
    assert.equal(res.body.submissionId,input.submissionId);
    assert.deepEqual(mail,[owner,visitor]);
    assert.deepEqual(status, [[input.submissionId,'ownerEmailStatus','sent'],[input.submissionId,'visitorEmailStatus','sent']]);
  } else {
    assert.equal(res.code,400);
    assert.match(res.body.error,/Missing required fields: businessName, contactName, email/);
    assert.deepEqual(states,['sending','error']);
    assert.deepEqual([saved,mail,status],[[],[],[]]);
  }
  assert.equal(unexpectedCalls,0);
}
const pages = new Set();
for (const match of source.matchAll(/JSON\.stringify\(\{\.\.\.o,source:"([^"]+)"\}\)/g)) {
  const page = match[1];
  assert.ok(!pages.has(page));
  pages.add(page);
  const component = source.slice(source.lastIndexOf('function ',match.index), source.indexOf('function ',match.index));
  await exercise(component,page,false);
  await exercise(component,page,true);
  console.info('PASS', page, 'original 400 / mapped 201');
}
assert.equal(pages.size,19);
console.info('PASS 19 published callbacks x 2 synthetic cases; zero CRM or external transport calls');
