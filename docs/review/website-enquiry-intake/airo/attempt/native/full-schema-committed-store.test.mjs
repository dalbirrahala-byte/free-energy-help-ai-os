// FULL EXPORTED ENQUIRIES SCHEMA VARIANT. Native execution pending.
// LOCAL SYNTHETIC ONLY. Run under unix-only.py against a fresh disposable server.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {lstatSync, readFileSync} from 'node:fs';
import net from 'node:net';
import {createCommittedMysqlAttemptStore} from '../committed-mysql-store.ts';

const require=createRequire(import.meta.url);
const socketPath=process.argv[3];
assert(typeof socketPath==='string' && socketPath.startsWith('/workspace/scratch/') && socketPath.endsWith('/test.sock'));
assert(lstatSync(socketPath).isSocket(), 'requires private local test socket');
const mysql=require(process.argv[2]);
const live=new Set();
const connect=async(database)=>{
 const c=await mysql.createConnection({socketPath,user:'root',...(database?{database}:{}),connectTimeout:2000});
 live.add(c);return c;
};
const database='synthetic_committed_attempts';
let count=0;
const check=async(name,f)=>{await f();console.log(`ok ${++count} - ${name}`);};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try {
 // Verify network denial BEFORE opening the database. No website/provider calls.
 await check('TCP socket creation is denied',()=>new Promise((resolve,reject)=>{
  const s=net.createServer();s.once('error',e=>{try{assert.equal(e.code,'EPERM');resolve();}catch(x){reject(x);}});
  s.listen(0,'127.0.0.1',()=>{s.close();reject(Error('TCP unexpectedly allowed'));});
 }));
 const admin=await connect();
 const [[v]]=await admin.query('SELECT VERSION() version, @@skip_networking no_network');
 assert.equal(v.no_network,1);console.log('# MySQL',v.version);
 // No IF NOT EXISTS: existing fixture data makes setup fail, never reused/reset.
 await admin.query('CREATE DATABASE synthetic_committed_attempts');
 await admin.query('USE synthetic_committed_attempts');
 await admin.query(readFileSync(new URL('./full-enquiries.fixture.sql', import.meta.url), 'utf8'));
 const observer=await connect(database);
 const originals=new Map();
 const snapshot=async n=>{
  const [rows]=await observer.execute('SELECT * FROM enquiries WHERE submission_id=?',[id(n)]);
  assert.equal(rows.length,1);
  const {crm_status,updated_at,...preserved}=rows[0];
  assert.equal(Object.keys(rows[0]).length,24);
  return preserved;
 };
 const seed=async n=>{
  await observer.execute(`INSERT INTO enquiries
   (submission_id,submitted_at,business_name,contact_name,email,phone,message,sms_consent,
    utm_source,owner_email_status,visitor_email_status)
   VALUES (?,?,'Synthetic business','Synthetic person','test@example.invalid',NULL,?,NULL,
    'synthetic','sent','sent')`,[id(n),'2026-11-18T12:00:00.000Z','Synthetic enquiry 🧪']);
  originals.set(n,await snapshot(n));
 };
 // Locking read waits for server rollback after abrupt client destruction.
 const state=async n=>{
  const [rows]=await observer.execute('SELECT crm_status FROM enquiries WHERE submission_id=? FOR UPDATE',[id(n)]);
  assert.deepEqual(await snapshot(n),originals.get(n),'CRM transition changed enquiry/email evidence');
  return rows[0].crm_status;
 };
 const open=()=>connect(database);
 const store=createCommittedMysqlAttemptStore(open);
 await check('24 owned transactions contend: exactly one committed claim',async()=>{
  await seed(1);const results=await Promise.all(Array.from({length:24},()=>store.claim(id(1))));
  assert.equal(results.filter(x=>x===true).length,1);assert.equal(await state(1),'uncertain');
 });
 await check('destroy before COMMIT rolls back; adapter never reports claim success',async()=>{
  await seed(2);const failing=createCommittedMysqlAttemptStore(async()=>{
   const c=await open();return {beginTransaction:()=>c.beginTransaction(),execute:(...a)=>c.execute(...a),commit:async()=>{c.destroy();throw Error('synthetic precommit disconnect');},destroy:()=>c.destroy()};
  });
  await assert.rejects(failing.claim(id(2)),/^Error: CRM persistence indeterminate$/);assert.equal(await state(2),'pending');
 });
 await check('real COMMIT followed by lost application acknowledgement stays held',async()=>{
  await seed(3);const lost=createCommittedMysqlAttemptStore(async()=>{
   const c=await open();return {beginTransaction:()=>c.beginTransaction(),execute:(...a)=>c.execute(...a),commit:async()=>{await c.commit();throw Error('synthetic lost commit acknowledgement');},destroy:()=>c.destroy()};
  });
  await assert.rejects(lost.claim(id(3)),/^Error: CRM persistence indeterminate$/);assert.equal(await state(3),'uncertain');
  // Direct SQL-state assertion only: do not invoke another handoff or replay.
 });
 await check('failed finalization COMMIT keeps the earlier durable hold',async()=>{
  await seed(4);assert.equal(await store.claim(id(4)),true);
  const failing=createCommittedMysqlAttemptStore(async()=>{
   const c=await open();return {beginTransaction:()=>c.beginTransaction(),execute:(...a)=>c.execute(...a),commit:async()=>{c.destroy();throw Error('synthetic finalization disconnect');},destroy:()=>c.destroy()};
  });
  await assert.rejects(failing.finish(id(4),'sent'),/^Error: CRM persistence indeterminate$/);assert.equal(await state(4),'uncertain');
 });
 await check('terminal sent and failed statuses persist and reject another claim',async()=>{
  for(const [n,status] of [[5,'sent'],[6,'failed']]){await seed(n);assert.equal(await store.claim(id(n)),true);assert.equal(await store.finish(id(n),status),true);assert.equal(await state(n),status);assert.equal(await store.claim(id(n)),false);}
 });
 console.log(`1..${count}\n# pass ${count}; no hosted acceptance`);
} finally {
 // Destroy every locally opened connection even when a fixture assertion fails.
 for(const c of live){try{c.destroy();}catch{}}
}
