import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const deps = resolve(process.argv[2]);
const {PGlite} = await import(pathToFileURL(resolve(deps, '@electric-sql/pglite/dist/index.js')));
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createConnection} from 'node:net';
import {createReceiver} from '../website-enquiry-intake/source/receiver.ts';
assert.deepEqual(Object.keys(process.env),[]);
for(const host of ['127.0.0.1','::1']){
  await new Promise((resolve,reject)=>{
    const s=createConnection({host,port:9});
    s.on('error',e=>e.code==='EPERM'?resolve():reject(e));
    s.on('connect',()=>{s.destroy();reject(Error('network accessible'));});
  });
}
let fetches=0;
globalThis.fetch=()=>{fetches++;throw Error('unexpected fetch');};
process.env.NOTIFICATION_RECIPIENT_EMAIL='owner@example.invalid';
const require=createRequire(import.meta.url);
const endpoint='https://fixture.invalid/api/website-enquiries';
const key='sender-alias-local-fixture-only-signing-value';
let active;
const db=await PGlite.create();
const read=p=>readFileSync(new URL('../website-enquiry-intake/' + p,import.meta.url),'utf8');
const schema=read('tests/postgres-local.sql');
await db.exec(schema.slice(schema.indexOf('DO $$ BEGIN\n IF NOT EXISTS'),schema.indexOf('\\ir')));
await db.exec(read('source/website-enquiries.sql'));
const receiver=createReceiver({key,now:Date.now,save:async p=>{
  assert.equal(p.submissionId,active.id);
  assert.equal(p.smsConsent,active.expected);
  assert.deepEqual(p.businessAnswers,active.answers);
  assert.equal(p.sourcePage,'/free-business-energy-health-check');
  active.events.push('receiver');
  return (await db.query('select public.ingest_website_enquiry($1) as receipt',[p])).rows[0].receipt;
}});
globalThis.fixture={
  client:{endpoint,approvedEndpoint:endpoint,key,now:Date.now,transport:async (url,init)=>{
    active.events.push('transport');
    const reply=await receiver(new Request(url,init));
    assert.equal(reply.status,201);
    return active.mode==='lost'?new Response('gateway',{status:503}):reply;
  }},
  async openFresh(){
    let next;
    return {
      async beginTransaction(){},
      async execute(sql,args){
        if(sql.includes("SET crm_status = 'uncertain'")){
          assert.equal(active.state,'pending');assert.deepEqual(args,[active.id]);next='uncertain';
        }else{
          assert.equal(active.state,'uncertain');assert.deepEqual(args,['sent',active.id]);next='sent';
        }
        return [{affectedRows:1},[]];
      },
      async commit(){active.state=next;active.events.push(next);},
      destroy(){},
    };
  },
  async email(msg){
    assert.ok([process.env.NOTIFICATION_RECIPIENT_EMAIL,'visitor@example.invalid'].includes(msg.to));
    if(msg.to===process.env.NOTIFICATION_RECIPIENT_EMAIL){
      assert.equal(msg.text.match(/^SMS consent:\s+(.+)$/m)?.[1],active.label);
      const html=msg.html.match(/>SMS consent<\/td><td[^>]*>([^<]+)<\/td>/)?.[1];
      assert.equal(html,active.expected==='yes'?'✅ Yes':active.expected==='no'?'❌ No':'— not answered');
    }
    active.events.push(msg.to===process.env.NOTIFICATION_RECIPIENT_EMAIL?'owner':'visitor');
  },
  db:{
    async execute({strings,values}){
      const cols=strings.join('?').match(/INSERT IGNORE INTO enquiries \(([\s\S]*?)\) VALUES/)[1].split(',').map(s=>s.trim().replace(/_([a-z])/g,(_,c)=>c.toUpperCase()));
      const fields=values.slice(0,-1);
      assert.equal(cols.length,fields.length+3);
      if (active.row) {
        active.events.push('duplicate-lookup');
        return [{affectedRows:0}];
      }
      active.state=values.at(-1);
      active.row=Object.fromEntries(cols.map((c,i)=>[c,i<fields.length?fields[i]:c==='crmStatus'?active.state:'pending']));
      active.events.push('save');
      return [{affectedRows:1}];
    },
    select(){return {from:()=>({where:async ([col,val])=>{assert.equal(active.row[col],val);return [active.mode==='changed'?{...active.row,email:'other@example.invalid'}:active.row];}})};},
    update(){return {set:v=>({where:async ([col,val])=>{assert.equal(active.row[col],val);Object.assign(active.row,v);}})};}
  }
};


const archivedBundles = resolve('dist') + '/';
import vm from 'node:vm';
import {preflight} from '../website-health-check-wiring/preflight.mjs';
const ts = require(resolve(deps,'typescript'));
const sharedPath='/api/quote';
const healthPath='/api/health-check/quote';
const sourceEntry='import quote__post          from "./api/quote/POST";\napp.post("/api/quote",            quote__post);';
const sourceForm = `async function handleSubmit() {
  const submissionId = crypto.randomUUID();
  const fd = new FormData(formRef.current);
  const body = {source:'health-check-form', submissionId, smsConsent, postcode:fd.get('postcode'),
    energyType:fd.get('energyType'), contractEnd:fd.get('contractEnd'), annualSpend:fd.get('annualSpend'),
    businessName:fd.get('businessName'), contactName:fd.get('contactName'), email:fd.get('email'),
    sourcePage:fd.get('sourcePage')};
  return fetch('/api/quote',{method:'POST',body:JSON.stringify(body)});
}`;
const wired = preflight(ts, sourceEntry, sourceForm);
function handleHealthCheck(fields, fetch) {
  const formRef = {current:fields};
  class FormData {
    constructor(form) { assert.equal(form,fields); }
    get(key) { return fields[key] ?? null; }
  }
  return vm.runInNewContext(wired.healthCheckForm + '\nhandleSubmit()', {
    formRef, FormData, fetch, smsConsent:fields.smsConsent, crypto:{randomUUID:()=>fields.submissionId}
  });
}
const answers={postcode:'FIXTURE',energyType:'fixture energy',contractEnd:'fixture term',annualSpend:'fixture spend'};
const contact={businessName:'Synthetic',contactName:'Fixture',email:'visitor@example.invalid',smsConsent:'',
  sourcePage:'/free-business-energy-health-check'};

try {
  for (const [index,name,bundle,target,fields,expectedStatus,expectedAnswers] of [
    [1,'ordinary quote', 'fixture',sharedPath,{},'excluded',undefined],
    [2,'health check with answers and signed receipt','fixture',healthPath,answers,'sent',answers],
    [3,'health check with answers and CRM disabled','dormant',healthPath,answers,'pending',answers],
    [4,'health check with unanswered optional fields','fixture',healthPath,{},'sent',undefined],
    [5,'commit then lost CRM reply','fixture',healthPath,answers,'uncertain',answers],
    [6,'dedicated missing reference','fixture',healthPath,answers,null,answers],
    [7,'changed saved email','fixture',healthPath,answers,'pending',answers],
  ]) {
    const id='00000000-0000-4000-8000-'+String(index+9970).padStart(12,'0');
    active={mode:index===5?'lost':index===7?'changed':'normal',id,expected:null,label:'Not answered',answers:expectedAnswers,events:[]};
    const handlers=require(archivedBundles+bundle+'.cjs');
    const routes=new Map();
    vm.runInNewContext(wired.entry.split('\n').filter(line=>!line.startsWith('import ')).join('\n'),{
      app:{post(path,handler){assert.equal(routes.has(path),false);routes.set(path,handler);}},
      quote__post:handlers.default,
      verifiedEnquiry:handlers.verifiedEnquiry,
    });
    assert.deepEqual([...routes.keys()],[sharedPath,healthPath]);
    const requested=[];
    async function post(path, options) {
      requested.push(path);
      assert.equal(path,target);
      assert.equal(options.method,'POST');
      const res={status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
      await routes.get(path)({body:JSON.parse(options.body)},res);
      return res;
    }
    const payload={...contact,...fields,submissionId:id};
    if(index===6) delete payload.submissionId;
    const reply=await (target===healthPath?handleHealthCheck(payload,post):
      post(sharedPath,{method:'POST',body:JSON.stringify(payload)}));
    if(index===6 || index===7) {
      assert.equal(reply.code,index===6?400:500);
      assert.deepEqual(active.events,index===6?[]:['save']);
      assert.deepEqual(requested,[healthPath]);
      if(index===7) assert.equal(reply.body.submissionId,id);
      assert.equal((await db.query('select count(*)::int as n from public.website_enquiry_receipts where submission_id=$1',[id])).rows[0].n,0);
      console.log('PASS',name); continue;
    }
    assert.equal(reply.code,201);
    assert.deepEqual(reply.body,{ok:true,submissionId:id,created:true});
    assert.equal(active.state,expectedStatus);
    assert.equal(active.row.smsConsent,null);
    assert.deepEqual(JSON.parse(active.row.businessAnswers),expectedAnswers??null);
    const received=expectedStatus==='sent'||index===5;
    const expectedEvents=received?['save','owner','visitor','uncertain','transport','receiver','sent']:['save','owner','visitor'];
    if(index===5) expectedEvents.pop();
    assert.deepEqual(active.events,expectedEvents);
    const result=await db.query("select l.notes::jsonb as notes,l.consent_given as consent from public.website_enquiry_receipts r join public.leads l on r.lead_id=l.id join public.audit_log a on a.correlation_id=r.submission_id and a.entity_id=l.id::text where r.submission_id=$1",[id]);
    assert.equal(result.rows.length,Number(received));
    if(received) {
      assert.deepEqual(result.rows[0].notes.businessAnswers,expectedAnswers);
      assert.equal(Object.hasOwn(result.rows[0].notes,'businessAnswers'),expectedAnswers!==undefined);
      assert.equal(result.rows[0].consent,false);
    }
    if(index===2 || index===5) {
      const duplicate=await post(healthPath,{method:'POST',body:JSON.stringify(payload)});
      assert.equal(duplicate.code,201);
      assert.deepEqual(duplicate.body,{ok:true,submissionId:id,created:false});
      assert.deepEqual(active.events,[...expectedEvents,'duplicate-lookup']);
      const {rows}=await db.query('select count(*)::int as count from public.website_enquiry_receipts where submission_id=$1',[id]);
      assert.equal(rows[0].count,1);
    }
    assert.deepEqual(requested,(index===2||index===5)?[target,target]:[target]);
    console.log('PASS',name);
  }
  assert.equal(fetches,0);
} finally {await db.close();}
