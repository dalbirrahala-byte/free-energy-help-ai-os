import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {connect} from 'node:net';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {readBusinessAttempt, submitBusinessQuote} from './business-quote-attempt.mjs';

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
const sharedRoute = (await import(pathToFileURL(process.argv[3]))).default;
const owner = 'owner@example.invalid', visitor = 'visitor@example.invalid';
process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;

const id = '00000000-0000-4000-8000-000000000133';
async function exercise(page, component, outcome) {
  const initial = component.match(/\[o,d\]=k\.useState\((\{[^}]*\})\)/)[1];
  const fields = vm.runInNewContext('(' + initial + ')');
  for (const field of Object.keys(fields)) fields[field] = 'Synthetic ' + field;
  fields.email = visitor;
  const form = {elements:{namedItem:unexpected}};
  const original = component.match(/,y=(async f=>.*?);return e\.jsxs\(/)[1];
  const request = '(await fetch("/api/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...o,source:"' + page + '"})})).ok?';
  assert.ok(original.includes(request) && original.includes(':a("error")'));
  // Exercise the actual page reset and state setters with the new attempt adapter.
  const source = original.replace(request,
    'const r=await submitBusinessQuote(f.currentTarget,o,page,deps); display(r); r.status==="saved" && !r.existing ?')
    .replace(':a("error")', ':a(r.status)');
  const values = new Map(), mail = [], status = [], rows = [], requests = [], displayed = [], states = [];
  let ids = 0, resets = 0, clears = 0;
  const storage = {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value)};
  const gate = Promise.withResolvers();
  globalThis.fixture = {mail, status, save(input, crmStatus) {
    rows.push({input, crmStatus});
    return {ok:true, created:true, row:{...input, crmStatus, ownerEmailStatus:'pending', visitorEmailStatus:'pending'}};
  }};
  let serverReply;
  const deps = {storage, newId() { ids++; return id; }, async post(path, options) {
    requests.push({path, body:JSON.parse(options.body), method:options.method});
    await gate.promise;
    const res = {status(code) {this.code=code; return this;}, json(data) {this.data=data;}};
    await sharedRoute({body:requests[0].body}, res);
    serverReply = res;
    if (outcome === 'lost') throw Error('Synthetic loss after website save');
    const reply = {...res.data};
    if (outcome === 'mismatch') reply.submissionId = '00000000-0000-4000-8000-000000000009';
    return Response.json(reply, {status:res.code});
  }};
  function mount() {
    return vm.runInNewContext('(' + source + ')', {
      page, deps, submitBusinessQuote, o:fields, a:value => states.push(value),
      t:{current:{reset() { resets++; }}}, d() { clears++; }, display:r => displayed.push(r),
    });
  }
  const event = {preventDefault() {}, currentTarget:form};
  const first = mount()(event);
  const held = {status:'held', submissionId:id};
  assert.deepEqual(readBusinessAttempt(storage,page),held);
  await mount()(event);
  assert.deepEqual(displayed.at(-1),{...held, existing:true});
  gate.resolve();
  await first;
  const confirmed = outcome === 'matched';
  const result = confirmed ? {status:'saved', submissionId:id} : held;
  assert.deepEqual(displayed.at(-1),result);
  assert.equal(states.at(-1),confirmed ? 'sent' : 'held');
  assert.deepEqual(readBusinessAttempt(storage,page),result);
  await mount()(event);
  assert.deepEqual(displayed.at(-1),{...result,existing:true});
  assert.equal(resets,Number(confirmed));
  assert.equal(clears,Number(confirmed));
  const {company,name,...details} = fields;
  const sourcePage = requests[0].body.sourcePage;
  assert.ok(typeof sourcePage === 'string' && bundle.includes('path:"' + sourcePage + '"'));
  assert.deepEqual(requests,[{path:'/api/quote', method:'POST',
    body:{...details, businessName:company, contactName:name, source:page, sourcePage, submissionId:id}}]);
  assert.equal(ids,1);
  assert.equal(values.size,1);
  assert.deepEqual(JSON.parse([...values.values()][0]),result);
  assert.equal(serverReply.code,201);
  assert.equal(serverReply.data.ok,true);
  assert.equal(serverReply.data.created,true);
  assert.equal(serverReply.data.submissionId,id);
  assert.equal(rows.length,1);
  assert.equal(rows[0].input.submissionId,id);
  assert.equal(rows[0].crmStatus,'excluded');
  assert.deepEqual(mail,[owner,visitor]);
  assert.deepEqual(status,[[id,'ownerEmailStatus','sent'],[id,'visitorEmailStatus','sent']]);
  assert.equal(unexpectedCalls,0);
}

const pages = new Set();
for (const match of source.matchAll(/JSON\.stringify\(\{\.\.\.o,source:"([^"]+)"\}\)/g)) {
  const page = match[1];
  const component = source.slice(source.lastIndexOf('function ',match.index), source.indexOf('function ',match.index));
  assert.ok(component.includes('src/pages/' + page + '.tsx') && !pages.has(page));
  pages.add(page);
  for (const outcome of ['matched','lost','mismatch']) await exercise(page,component,outcome);
}
assert.equal(pages.size,19);
console.info('57/57 business form receipt cases passed across 19 pages');
