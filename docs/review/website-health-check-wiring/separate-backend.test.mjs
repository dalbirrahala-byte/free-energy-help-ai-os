import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { wireHealthCheck } from './wire-health-check.mjs';

assert.deepEqual(Object.keys(process.env), []);
globalThis.fetch = () => assert.fail('Unexpected transport');
process.env.NOTIFICATION_RECIPIENT_EMAIL = 'owner@example.invalid';
const events = [];
let row;
const sharedStore = {
  saveEnquiry: async input => {
    events.push('shared store');
    return {ok:true, created:true, row:{...input, ownerEmailStatus:'pending', visitorEmailStatus:'pending', crmStatus:'pending'}};
  },
  updateDeliveryStatus: async () => ({ok:true}),
  enquiryRowToCrmPayload: value => value,
};
const database = {
  execute: async ({parts, values}) => {
    const columns = parts.join('?').match(/INSERT IGNORE INTO enquiries \(([\s\S]*?)\) VALUES/)[1]
      .split(',').map(name => name.trim().replace(/_([a-z])/g, (_,c) => c.toUpperCase()));
    assert.ok(columns.includes('businessAnswers'));
    const data = [...values.slice(0,-1), 'pending', 'pending', values.at(-1)];
    assert.equal(columns.length, data.length);
    row = Object.fromEntries(columns.map((column, index) => [column, data[index]]));
    events.push('dedicated store');
    return [{affectedRows:1}];
  },
  select: () => ({from: table => {
    assert.equal(table.businessAnswers, 'business_answers');
    return {where: async () => [row]};
  }}),
  update: () => ({set: changes => ({where: async () => Object.assign(row, changes)})}),
};

globalThis.stageFixture = {sharedStore, database, mail: msg => events.push(msg.to)};
const mocks = new Map([
  ['@/server/email.js', 'export const sendEmail = globalThis.stageFixture.mail'],
  ['@/lib/phone.js', 'export const TEL1="fixture", TEL1_HREF="fixture"'],
  ['@/server/lib/enquiry-store.js', 'export const {saveEnquiry,updateDeliveryStatus,enquiryRowToCrmPayload}=globalThis.stageFixture.sharedStore'],
  ['@/server/lib/crm-client.js', 'export const deliverToCrm=async()=>({ok:true,endpointAbsent:true})'],
  ['../db/client.js', 'export const db=globalThis.stageFixture.database'],
  ['drizzle-orm', 'export const eq=(...args)=>args, sql=(parts,...values)=>({parts,values})'],
  ['drizzle-orm/mysql-core', `
    const col = name => { const x={name}; for(const f of ['primaryKey','autoincrement','notNull','unique','default','defaultNow','onUpdateNow']) x[f]=()=>x; return x; };
    export const int=col,varchar=col,text=col,timestamp=col,index=col,uniqueIndex=col;
    export const mysqlTable=(_,fields)=>Object.fromEntries(Object.entries(fields).map(([key,c])=>[key,c.name]));
  `],
]);
registerHooks({resolve(name, context, next) {
  if (mocks.has(name)) return {shortCircuit:true,url:'data:text/javascript,' + encodeURIComponent(mocks.get(name))};
  let path;
  if (name.startsWith('@/')) path = resolve('src',name.slice(2));
  else if (name.startsWith('.') && name.endsWith('.js') && context.parentURL?.startsWith('file:')) {
    path = fileURLToPath(new URL(name,context.parentURL));
  }
  if (path && existsSync(path.replace(/\.js$/,'.ts'))) return {shortCircuit:true,url:pathToFileURL(path.replace(/\.js$/,'.ts')).href};
  return next(name,context);
}});

const entry = 'import quote__post from "./api/quote/POST";\napp.post("/api/quote", quote__post);';
const form = "const body={source:'health-check-form'}; fetch('/api/quote', {})";
const wired = wireHealthCheck(entry, form);
const routes = new Map();
globalThis.app = {post(path, handler) {routes.set(path, handler);}};
const server = pathToFileURL(resolve('src/server') + '/');
const importsResolved = wired.entry.replace(/from "([^"]+)"/g, (_, p) => 'from "' + new URL(p+'.ts', server) + '"');
await import('data:text/javascript,' + encodeURIComponent(importsResolved));
assert.equal(routes.size, 2);
const answers = {postcode:'TEST', energyType:'fixture', contractEnd:'fixture date', annualSpend:'fixture band'};
const base = {businessName:'Fixture Ltd', contactName:'Fixture', email:'visitor@example.invalid'};
for (const [path,store,tail] of [['/api/quote','shared store','401'], ['/api/health-check/quote','dedicated store','402']]) {
  events.length=0;
  const id='00000000-0000-4000-8000-000000000'+tail;
  const res = {status(n){this.code=n;return this;}, json(body){this.body=body;return this;}};
  await routes.get(path)({body:{...base,...answers,submissionId:id}},res);
  assert.equal(res.code,201);
  assert.equal(res.body.submissionId,id);
  assert.deepEqual(events,[store,'owner@example.invalid','visitor@example.invalid']);
  if(path==='/api/quote') assert.equal(row,undefined);
  else {
    assert.deepEqual(JSON.parse(row.businessAnswers), answers);
    assert.equal(row.crmStatus,'pending');
    assert.equal(row.smsConsent,null);
  }
}
console.log('PASS independent route imports, shared email order, dedicated store, four answers and disabled CRM');
