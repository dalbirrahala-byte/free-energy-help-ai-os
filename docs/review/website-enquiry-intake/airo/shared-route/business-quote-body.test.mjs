import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {connect} from 'node:net';
import vm from 'node:vm';
import {prepareBusinessQuote} from './business-quote-body.mjs';

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

async function exercise(component, page, missing) {
  const initial = component.match(/\[o,d\]=k\.useState\((\{[^}]*\})\)/)[1];
  const state = vm.runInNewContext('(' + initial + ')');
  for (const field of ['name','company','email']) assert.ok(Object.hasOwn(state, field));
  Object.assign(state, {name:'Synthetic Contact', company:'Fixture Business', email:visitor});
  assert.match(component, /onSubmit:y\b/);
  // Pin the precise submit expression and attachment point used by these 19 forms.
  assert.match(component, /name:"company",type:"text",value:o.company/);
  assert.ok(component.includes('src/pages/' + page + '.tsx'));
  if (missing) state[missing] = '   ';
  state.message = 'Synthetic enquiry details';
  const reported = [];
  let validity = '', edit;
  const form = {elements:{namedItem(key) {
    assert.equal(key,missing);
    return {
      setCustomValidity(message) {validity = message;},
      reportValidity() {reported.push([key,validity]);},
      addEventListener(event, handler, options) {
        assert.equal(event,'input');
        assert.equal(options.once,true);
        edit = handler;
      },
    };
  }}};
  const originalSubmit = component.match(/,y=(async f=>.*?);return e\.jsxs\(/)[1];
  const shape = 'JSON.stringify({...o,source:"' + page + '"})';
  assert.ok(originalSubmit.includes(shape));
  const start = 'f.preventDefault(),a("sending")';
  assert.ok(originalSubmit.includes(start));
  const submit = originalSubmit
    .replace(start, 'f.preventDefault(); const body = prepareBusinessQuote(f.currentTarget,o,' + JSON.stringify(page) + '); if (!body) return; a("sending")')
    .replace(shape, 'JSON.stringify(body)');
  const states = [], requests = [], responses = [], saved = [], mail = [], status = [];
  globalThis.fixture = {mail, status, save(input, crmStatus) {
    saved.push({input, crmStatus});
    return {ok:true, created:true, row:{...input, crmStatus, ownerEmailStatus:'pending', visitorEmailStatus:'pending'}};
  }};
  const callback = vm.runInNewContext('(' + submit + ')', {
    prepareBusinessQuote, o:state, t:{current:null}, a:value => states.push(value), d:() => {},
    async fetch(path, options) {
      const body = JSON.parse(options.body);
      requests.push({path, method:options.method, body});
      const res = {status(code) {this.code=code; return this;}, json(value) {this.body=value;}};
      await sharedRoute({body},res);
      responses.push(res);
      return {ok:res.code >= 200 && res.code < 300};
    },
  });
  await callback({currentTarget:form, preventDefault() {}});
  if (missing) {
    assert.deepEqual(reported, [[missing, missing === 'company' ? 'Please enter your business name.' : 'Please enter your name.']]);
    assert.ok(validity);
    edit();
    assert.equal(validity,'');
    assert.deepEqual([states,requests,responses,saved,mail,status],[[],[],[],[],[],[]]);
  } else {
    const {name, company, ...details} = state;
    const sourcePage = requests[0].body.sourcePage;
    assert.ok(typeof sourcePage === 'string' && source.includes('path:"' + sourcePage + '"'));
    assert.deepEqual(requests,[{path:'/api/quote', method:'POST', body:{...details, contactName:name, businessName:company, source:page, sourcePage}}]);
    assert.equal(responses.length,1);
    const [res] = responses;
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
  }
  assert.equal(unexpectedCalls,0);
}
const pages = new Set();
for (const match of source.matchAll(/JSON\.stringify\(\{\.\.\.o,source:"([^"]+)"\}\)/g)) {
  const page = match[1];
  assert.ok(!pages.has(page));
  pages.add(page);
  const component = source.slice(source.lastIndexOf('function ',match.index), source.indexOf('function ',match.index));
  for (const missing of ['company','name',null]) await exercise(component,page,missing);
  console.info('PASS', page, 'blank company, blank name, complete enquiry');
}
assert.equal(pages.size,19);
console.info('PASS 57 candidate cases; zero CRM or external calls');
