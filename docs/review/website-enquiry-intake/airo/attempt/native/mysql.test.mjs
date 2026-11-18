import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import net from 'node:net';
import { privateTestSocket } from './private-test-socket.mjs';
import {createMysqlAttemptStore,CLAIM_SQL,FINISH_SQL} from '../mysql-attempt-store.ts';
const require=createRequire(import.meta.url);
const mysql=require(process.argv[2]);
const socketPath=privateTestSocket(process.argv[3]);
let count=0;
const check=async(name,f)=>{await f();console.log(`ok ${++count} - ${name}`);};
const conn=()=>mysql.createConnection({socketPath,user:'root',database:'synthetic_attempts'});
const admin=await mysql.createConnection({socketPath,user:'root'});
const [[v]]=await admin.query('SELECT VERSION() version, @@skip_networking no_network, @@autocommit autocommit');
console.log('# native MySQL',v);assert.equal(v.no_network,1);assert.equal(v.autocommit,1);
await check('seccomp rejects TCP socket creation',()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',e=>{try{assert.equal(e.code,'EPERM');resolve();}catch(x){reject(x);}});s.listen(0,'127.0.0.1',()=>{s.close();reject(Error('TCP was allowed'));});}));
await admin.query('CREATE DATABASE synthetic_attempts');
// Exact relevant column types/unique key from supplied Airo schema. Not a full migration test.
await admin.query("CREATE TABLE synthetic_attempts.enquiries (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, submission_id VARCHAR(36) NOT NULL UNIQUE, crm_status VARCHAR(10) NOT NULL DEFAULT 'pending') ENGINE=InnoDB");
const c=await conn();
const store=createMysqlAttemptStore((q,a)=>c.execute(q,a));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const seed=async n=>c.execute('INSERT INTO enquiries (submission_id) VALUES (?)',[id(n)]);
const state=async n=>(await c.execute('SELECT crm_status FROM enquiries WHERE submission_id=?',[id(n)]))[0][0].crm_status;
try {
 await check('real mysql2 result shape: one committed claim then no match',async()=>{await seed(1);assert.equal(await store.claim(id(1)),true);assert.equal(await state(1),'uncertain');assert.equal(await store.claim(id(1)),false);assert.equal(await store.claim(id(999)),false);});
 await check('24 simultaneous native connections: exactly one claim wins',async()=>{await seed(2);const cs=await Promise.all(Array.from({length:24},conn));try{const result=await Promise.all(cs.map(x=>createMysqlAttemptStore((q,a)=>x.execute(q,a)).claim(id(2))));assert.equal(result.filter(Boolean).length,1);assert.equal(await state(2),'uncertain');}finally{await Promise.all(cs.map(x=>x.end()));}});
 await check('committed claim survives abrupt client destruction',async()=>{await seed(3);const x=await conn();assert.equal(await createMysqlAttemptStore((q,a)=>x.execute(q,a)).claim(id(3)),true);x.destroy();assert.equal(await state(3),'uncertain');assert.equal(await store.claim(id(3)),false);});
 await check('lost application acknowledgment after commit cannot reopen claim',async()=>{await seed(4);const x=await conn();const s=createMysqlAttemptStore(async(q,a)=>{await x.execute(q,a);x.destroy();throw Error('synthetic lost acknowledgment');});await assert.rejects(s.claim(id(4)));assert.equal(await state(4),'uncertain');assert.equal(await store.claim(id(4)),false);});
 await check('native transaction rollback proves why open-transaction executors are forbidden',async()=>{await seed(5);const x=await conn();await x.beginTransaction();const [r]=await x.execute(CLAIM_SQL,[id(5)]);assert.equal(r.affectedRows,1);assert.equal(await state(5),'pending');await x.rollback();await x.end();assert.equal(await state(5),'pending');});
 await check('server kills uncommitted claimant: no durable claim',async()=>{await seed(6);const x=await conn();x.on('error',()=>{});await x.beginTransaction();await x.execute(CLAIM_SQL,[id(6)]);const [[r]]=await x.query('SELECT CONNECTION_ID() cid');await admin.query('KILL CONNECTION '+Number(r.cid));x.destroy();assert.equal(await state(6),'pending');});
 await check('failed finalization on dead connection retains uncertain hold',async()=>{await seed(7);const x=await conn();const s=createMysqlAttemptStore((q,a)=>x.execute(q,a));assert.equal(await s.claim(id(7)),true);x.destroy();await assert.rejects(s.finish(id(7),'sent'));assert.equal(await state(7),'uncertain');assert.equal(await store.claim(id(7)),false);});
 await check('final sent/failed states commit and cannot be claimed or overwritten',async()=>{for(const [n,s] of [[8,'sent'],[9,'failed']]){await seed(n);assert.equal(await store.claim(id(n)),true);assert.equal(await store.finish(id(n),s),true);assert.equal(await state(n),s);assert.equal(await store.claim(id(n)),false);assert.equal(await store.finish(id(n),'sent'),false);}});
 console.log(`1..${count}\n# pass ${count}; fail 0; no hosted acceptance`);
} finally {await c.end();await admin.end();}
