import assert from 'node:assert/strict';
import {closeSync, openSync, readFileSync, statSync, writeSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {connect} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

const [runDir, ddlPath] = process.argv.slice(2);
assert.match(runDir, /^\/tmp\/feh133-purpose-[a-zA-Z0-9]+$/);
await new Promise((resolve, reject) => {
  const socket = connect(9, '127.0.0.1');
  socket.once('error', e => e.code === 'EPERM' ? resolve() : reject(e));
  socket.once('connect', () => { socket.destroy(); reject(Error('Socket creation permitted')); });
});
let fetches = 0;
globalThis.fetch = () => { fetches++; throw Error('Unexpected fetch'); };
const fd = openSync(runDir + '/input', 'w');
let serial = 0;
function literal(value) {
  if (value === null) return 'NULL';
  assert.equal(typeof value, 'string');
  return "CONVERT(X'" + Buffer.from(value).toString('hex') + "' USING utf8mb4)";
}
// Each query gets an exclusive result file and a later completion marker.
async function query(statements, select) {
  const base = runDir + '/result' + (++serial);
  for (const sql of [...statements, select + " INTO OUTFILE '" + base + "'", "SELECT 1 INTO OUTFILE '" + base + ".done'"]) {
    writeSync(fd, sql.trim().replace(/;$/, '').replace(/\s+/g, ' ') + ';\n');
  }
  for (let i=0; i<1000; i++) {
    if (statSync(base + '.done', {throwIfNoEntry:false})?.size > 0) return readFileSync(base, 'utf8').trim();
    await delay(10);
  }
  throw Error('MySQL result deadline at statement group ' + serial);
}
const columns = 'submission_id submitted_at business_name contact_name email phone meter_numbers current_supplier message sms_consent utm_source utm_medium utm_campaign utm_content utm_term gclid fbclid source_page owner_email_status visitor_email_status crm_status'.split(' ');
const schema = Object.fromEntries(columns.map(col => [col.replace(/_(.)/g, (_,c)=>c.toUpperCase()), col]));
const rowJson = 'JSON_OBJECT(' + Object.entries(schema).map(([key,col])=> "'" + key + "'," + col).join(',') + ')';
async function rows([col, value]) {
  assert.ok(columns.includes(col));
  const aggregate = '(SELECT JSON_ARRAYAGG(' + rowJson + ') FROM enquiries WHERE ' + col + '=' + literal(value) + ')';
  const hex = await query([], 'SELECT HEX(COALESCE(' + aggregate + ",JSON_ARRAY()))");
  return JSON.parse(Buffer.from(hex, 'hex').toString('utf8'));
}
async function executePrepared(statement, values) {
  const bind = values.map((value,index)=>'SET @p' + index + '=' + literal(value));
  const args = values.map((_,i)=>'@p'+i).join(',');
  const affected = await query(['SET @stmt=' + literal(statement), 'PREPARE action FROM @stmt', ...bind, 'EXECUTE action USING ' + args], 'SELECT ROW_COUNT()');
  return [{affectedRows:Number(affected)}, []];
}
const orm = {
  execute({strings, values}) { return executePrepared(strings.join('?'),values); },
  select() { return {from:()=>({where:rows})}; },
  update() { return {set:changes=>({where:async ([col,id])=>{
    assert.equal(col,'submission_id');
    const [[key,value]]=Object.entries(changes);
    assert.ok(['ownerEmailStatus','visitorEmailStatus','crmStatus'].includes(key));
    assert.equal(await query(['UPDATE enquiries SET ' + schema[key] + '=' + literal(value) + ' WHERE submission_id=' + literal(id)], 'SELECT ROW_COUNT()'),'1');
  }})}; },
};
const owner='owner@example.invalid', visitor='visitor@example.invalid';
process.env.NOTIFICATION_RECIPIENT_EMAIL=owner;
const events=[];
const initialStates=[];
let currentId, failRecipient;
globalThis.fixture = {orm,schema,
  async email({to}) {
    events.push(to);
    const [saved]=await rows(['submission_id',currentId]);
    initialStates.push(saved.crmStatus);
    if (to===failRecipient) throw Error('Synthetic email failure');
  },
  handoff(id,created,status,payload) {
    events.push('crm'); assert.equal(id,currentId); assert.equal(created,true);
    assert.equal(status,'pending'); assert.equal(payload().submissionId,id); return 'disabled';
  },
};
const stubs = {
  'drizzle-orm':'export const eq=(...args)=>args, sql=(strings,...values)=>({strings,values})',
  '../db/schema.js':'export const enquiries=globalThis.fixture.schema',
  '../db/client.js':'export const db=globalThis.fixture.orm',
  '@/lib/phone.js':'export const TEL1="fixture",TEL1_HREF="fixture"',
  '@/server/email.js':'export const sendEmail=globalThis.fixture.email',
  '@/server/lib/quote-crm-step.js':'export const finishQuoteCrm=globalThis.fixture.handoff',
};
registerHooks({resolve(name,ctx,next){
  if(name==='@/server/lib/enquiry-store.js') return {shortCircuit:true,url:new URL('./enquiry-store.candidate.ts',import.meta.url).href};
  if(Object.hasOwn(stubs,name)) return {shortCircuit:true,url:'data:text/javascript,'+encodeURIComponent(stubs[name])};
  return next(name,ctx);
}});
try {
  const ddl=readFileSync(ddlPath,'utf8').split('\n').filter(l=>!l.startsWith('--')).join(' ');
  const cfg=await query(['CREATE DATABASE feh_fixture','USE feh_fixture','SET autocommit=1',ddl], "SELECT CONCAT(VERSION(),' ',@@skip_networking,' ',@@autocommit)");
  assert.match(cfg,/^8\.4\.13\S* 1 1$/);
  const {default:shared,verifiedEnquiry}=await import('./quote-held.ts');
  const {getPendingOnlyCrmEnquiries}=await import('./enquiry-store.candidate.ts');
  const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
  async function submit(handler,n,source) {
    currentId=id(n);
    const res={status(code){this.code=code;return this;},json(body){this.body=body;}};
    await handler({body:{submissionId:currentId,source,email:visitor,businessName:'Fixture',contactName:'Fixture',
      sourcePage:'/business-energy-health-check',initialCrmStatus:'pending',crmStatus:'pending'}},res);
    assert.equal(res.body.submissionId,currentId);
    return res;
  }
  const purposes=['resource-download-renewal-checklist','reports-hub-notify','unknown',undefined,'homepage-quote-form','health-check-form'];

  for(let i=0;i<8;i++){
    failRecipient=i===6?owner:i===7?visitor:undefined;
    const res=await submit(shared,i,purposes[i]);
    assert.equal(res.code,i===6?500:201);
    assert.deepEqual(events.splice(0),i===6?[owner]:[owner,visitor]);
    const [r]=await rows(['submission_id',currentId]);
    assert.deepEqual([r.crmStatus,r.ownerEmailStatus,r.visitorEmailStatus],
      ['excluded',i===6?'failed':'sent',i===6?'pending':i===7?'failed':'sent']);
  }
  failRecipient=undefined;
  const duplicate=await submit(verifiedEnquiry,0,'homepage-quote-form');
  assert.deepEqual(duplicate.body,{ok:true,submissionId:id(0),created:false});
  assert.deepEqual(events,[]);

  assert.equal((await submit(verifiedEnquiry,8)).body.created,true);
  assert.deepEqual(events.splice(0),[owner,visitor,'crm']);
  assert.equal((await submit(shared,8,'reports-hub-notify')).body.created,false);
  assert.deepEqual(events,[]);
  const pending=await getPendingOnlyCrmEnquiries();
  assert.equal(pending.ok,true); assert.deepEqual(pending.rows.map(r=>r.submissionId),[id(8)]);
  assert.equal((await rows(['crm_status','excluded'])).length,8);
  assert.deepEqual(initialStates,[...Array(15).fill('excluded'),'pending','pending']);
  const {createMysqlAttemptStore}=await import('./mysql-attempt-store.ts');
  const attempts=createMysqlAttemptStore(executePrepared);
  for (let i=0;i<8;i++) assert.equal(await attempts.claim(id(i)),false);
  assert.equal(await attempts.claim(id(8)),true);
  assert.equal((await rows(['crm_status','uncertain'])).length,1);
  assert.equal((await rows(['crm_status','excluded'])).length,8);
  const afterClaim=await getPendingOnlyCrmEnquiries();
  assert.deepEqual(afterClaim,{ok:true,rows:[]});
  assert.equal(fetches,0);
  console.log('PASS MySQL '+cfg+'; eight excluded and unclaimable, one eligible claim, both duplicate directions held, zero fetches');
} finally { closeSync(fd); }
