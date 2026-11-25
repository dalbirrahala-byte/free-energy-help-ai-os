import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync, rmSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {connect} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

await new Promise((resolve,reject) => {
  const socket = connect(9, '127.0.0.1');
  socket.once('connect', () => { socket.destroy(); reject(Error('Network isolation required')); });
  socket.once('error', error => error.code === 'EPERM' ? resolve() : reject(error));
});
globalThis.fetch = () => { throw Error('Unexpected transport'); };
const owner = 'owner@example.invalid', visitor = 'visitor@example.invalid';
process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;
const dir = mkdtempSync(join(tmpdir(), 'feh-shared-form-'));
const file = join(dir, 'test.sqlite');
let db = new DatabaseSync(file);
try {
  const fields = ('submission_id submitted_at business_name contact_name email phone meter_numbers current_supplier message sms_consent ' +
    'utm_source utm_medium utm_campaign utm_content utm_term gclid fbclid source_page owner_email_status visitor_email_status crm_status').split(' ');
  db.exec('create table enquiries (id integer primary key,' + fields.map(key => key + ' text' + (key === 'submission_id' ? ' unique' : '')).join(',') + ')');
  const aliases = Object.fromEntries(fields.map(name => [name.replace(/_(.)/g, (_,c) => c.toUpperCase()),name]));
  const projection = Object.entries(aliases).map(([key,name]) => name + ' as ' + key).join(',');
  const events = [];
  let failRecipient;
  globalThis.probe = {
    schema:aliases,
    orm:{
      execute({strings,values}) {
        const sql = strings.join('?').replace('INSERT IGNORE INTO','INSERT OR IGNORE INTO');
        return [{affectedRows:db.prepare(sql).run(...values).changes}];
      },
      select() { return {from:() => ({where:([column,value]) => db.prepare('select ' + projection + ' from enquiries where ' + column + '=?').all(value)})}; },
      update() { return {set:changes => ({where:([column,value]) => {
        const [[field,status]] = Object.entries(changes);
        return db.prepare('update enquiries set ' + aliases[field] + '=? where ' + column + '=?').run(status,value);
      }})}; },
    },
    email({to}) { events.push(to); if (to === failRecipient) throw Error('Synthetic mail failure'); },
    handoff(id,created,status,payload) {
      assert.equal(created,true); assert.equal(status,'pending'); assert.equal(payload().submissionId,id);
      events.push('crm'); return 'disabled';
    },
  };
  const modules = {
    'drizzle-orm':'export const eq=(...args)=>args,sql=(strings,...values)=>({strings,values})',
    '../db/schema.js':'export const enquiries=globalThis.probe.schema',
    '../db/client.js':'export const db=globalThis.probe.orm',
    '@/lib/phone.js':'export const TEL1="fixture",TEL1_HREF="fixture"',
    '@/server/email.js':'export const sendEmail=globalThis.probe.email',
    '@/server/lib/quote-crm-step.js':'export const finishQuoteCrm=globalThis.probe.handoff',
  };
  registerHooks({resolve(name,context,next) {
    if (name === '@/server/lib/enquiry-store.js') return {shortCircuit:true,url:new URL('./enquiry-store.candidate.ts',import.meta.url).href};
    if (Object.hasOwn(modules,name)) return {shortCircuit:true,url:'data:text/javascript,' + encodeURIComponent(modules[name])};
    return next(name,context);
  }});
  const {default:shared,verifiedEnquiry} = await import('./quote-held.ts');
  const {getPendingOnlyCrmEnquiries} = await import('./enquiry-store.candidate.ts');
  async function submit(handler,extra={},id=randomUUID(),status=201,created=true) {
    const res = {status(code){this.code=code;return this;}, json(value){this.value=value;}};
    await handler({body:{businessName:'Fixture',contactName:'Fixture',email:visitor,submissionId:id,...extra}},res);
    assert.equal(res.code,status);
    assert.equal(res.value.submissionId,id);
    if (status === 201) assert.equal(res.value.created,created);
    return id;
  }
  const excluded = [];
  for (const source of ['resource-download-renewal-checklist','reports-hub-notify','unknown',undefined,'homepage-quote-form','health-check-form']) {
    const id = await submit(shared,{source,sourcePage:'/business-energy-health-check',initialCrmStatus:'pending',crmStatus:'pending'});
    assert.deepEqual(events.splice(0),[owner,visitor]);
    excluded.push(id);
  }
  for (const recipient of [owner,visitor]) {
    failRecipient = recipient;
    excluded.push(await submit(shared,{},randomUUID(),recipient === owner ? 500 : 201));
    assert.deepEqual(events.splice(0),recipient === owner ? [owner] : [owner,visitor]);
  }
  failRecipient = undefined;
  db.close(); db = new DatabaseSync(file);
  await submit(verifiedEnquiry,{source:'homepage-quote-form'},excluded[0],201,false);
  assert.deepEqual(events,[]);
  const control = await submit(verifiedEnquiry);
  assert.deepEqual(events.splice(0),[owner,visitor,'crm']);
  for (const id of excluded) assert.equal(db.prepare('select crm_status from enquiries where submission_id=?').get(id).crm_status,'excluded');
  const pending = await getPendingOnlyCrmEnquiries();
  assert.equal(pending.ok,true);
  assert.deepEqual(pending.rows.map(r=>r.submissionId),[control]);
  console.info('PASS eight excluded rows after reopen; zero CRM calls; duplicate held; one eligible control');
} finally {
  db.close();
  rmSync(dir,{recursive:true,force:true});
}
