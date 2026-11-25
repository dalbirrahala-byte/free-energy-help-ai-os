// LOCAL SYNTHETIC ONLY. Run under unix-only.py against a fresh disposable server.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import net from 'node:net';
import { privateTestSocket } from './private-test-socket.mjs';
import {createQuoteCrmStep} from '../handoff.ts';
import {PATH} from '../../../source/contract.ts';
import {createCommittedMysqlAttemptStore} from '../committed-mysql-store.ts';

const require=createRequire(import.meta.url);
const socketPath=privateTestSocket(process.argv[3]);
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
 await admin.query("CREATE TABLE synthetic_committed_attempts.enquiries (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, submission_id VARCHAR(36) NOT NULL UNIQUE, crm_status VARCHAR(10) NOT NULL DEFAULT 'pending') ENGINE=InnoDB");
 const observer=await connect(database);
 const seed=n=>observer.execute('INSERT INTO enquiries (submission_id) VALUES (?)',[id(n)]);
 // Locking read waits for server rollback after abrupt client destruction.
 const state=async n=>(await observer.execute('SELECT crm_status FROM enquiries WHERE submission_id=? FOR UPDATE',[id(n)]))[0][0].crm_status;
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
 await check('final COMMIT succeeds but its acknowledgement is lost', async () => {
  const reference = id(7);
  await seed(7);
  let opens = 0;
  let sends = 0;
  const finalAckLost = createCommittedMysqlAttemptStore(async () => {
   const connection = await open();
   opens++;
   if (opens === 1) return connection;
   assert.equal(opens, 2);
   return {
    beginTransaction: () => connection.beginTransaction(),
    execute: (sql, args) => connection.execute(sql, args),
    async commit() {
     await connection.commit();
     throw Error('synthetic loss after final commit');
    },
    destroy: () => connection.destroy(),
   };
  });
  const endpoint = 'https://crm.example.invalid' + PATH;
  const submittedAt = '2030-01-01T00:00:00.000Z';
  const payload = {
   submissionId:reference, submittedAt, businessName:'Synthetic', contactName:'Fixture',
   email:'fixture@example.invalid', phone:null, meterNumbers:null, currentSupplier:null,
   message:null, smsConsent:null, sourcePage:null,
   attribution:{utmSource:null, utmMedium:null, utmCampaign:null, utmContent:null,
    utmTerm:null, gclid:null, fbclid:null},
  };
  const step = createQuoteCrmStep({store:finalAckLost, client:{
   endpoint, approvedEndpoint:endpoint, key:'fixture-only-final-ack-loss-133-test',
   now:() => Date.parse(submittedAt),
   async transport() {
    sends++;
    assert.equal(await state(7), 'uncertain');
    return Response.json({version:1, submissionId:reference, outcome:'created', leadId:'7'}, {status:201});
   },
  }});
  assert.equal(await step(reference, true, 'pending', () => payload), 'reconcile');
  const reader = await open();
  await reader.query('START TRANSACTION READ ONLY');
  try {
   const [rows] = await reader.execute('SELECT crm_status FROM enquiries WHERE submission_id=?', [reference]);
   assert.deepEqual(rows, [{crm_status:'sent'}]);
  } finally {
   await reader.rollback();
  }
  assert.equal(opens, 2);
  assert.equal(sends, 1);
 });
 await check('terminal sent and failed statuses persist and reject another claim',async()=>{
  for(const [n,status] of [[5,'sent'],[6,'failed']]){await seed(n);assert.equal(await store.claim(id(n)),true);assert.equal(await store.finish(id(n),status),true);assert.equal(await state(n),status);assert.equal(await store.claim(id(n)),false);}
 });
 console.log(`1..${count}\n# pass ${count}; no hosted acceptance`);
} finally {
 // Destroy every locally opened connection even when a fixture assertion fails.
 for(const c of live){try{c.destroy();}catch{}}
}
