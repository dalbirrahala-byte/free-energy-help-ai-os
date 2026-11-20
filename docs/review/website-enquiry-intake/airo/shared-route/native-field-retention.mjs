// Run only inside run-native-purpose.sh's disposable MySQL and no-network guard.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {prepareBusinessQuote} from './business-quote-body.mjs';

export async function traceFormFields({asset, rows, query, owner, visitor, fetchCount}) {
  const bytes = readFileSync(asset);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '6346d0755a91d04a4ab4b99e07d92b90b5ecd3789e0922efa0adcb7809393b88');
  const bundle = bytes.toString('utf8');
  // Resolve each form through its actual parent route in the pinned build.
  const routes = [...bundle.matchAll(/path:"([^"]+)",element:e\.jsx\(([$\w]+),\{\}\)\}/g)].flatMap(([,path,parent]) => {
    const start = bundle.indexOf('function ' + parent + '(');
    if (start < 0) return [];
    return [{path,body:bundle.slice(start,bundle.indexOf('function ',start+9))}];
  });
  const messages = [];
  globalThis.fixture.email = message => messages.push(message);
  let crmCalls = 0;
  globalThis.fixture.handoff = () => { crmCalls++; throw Error('Unexpected CRM call'); };
  const {default:sharedForm} = await import('./quote-held.ts');
  const {enquiryRowToCrmPayload} = await import('./enquiry-store.candidate.ts');
  const pages = new Set();
  const missing = {};
  let serial = 0;
  async function submit(body) {
    const submissionId = '00000000-0000-4000-8000-' + String(++serial).padStart(12,'0');
    const res = {status(code) {this.code=code; return this;}, json(receipt) {this.receipt=receipt;}};
    await sharedForm({body:{...body, submissionId}}, res);
    assert.equal(res.code,201);
    assert.deepEqual(res.receipt,{ok:true,submissionId,created:true});
    const result = await rows(['submission_id',submissionId]);
    assert.equal(result.length,1);
    const row = result[0];
    assert.deepEqual([row.crmStatus,row.ownerEmailStatus,row.visitorEmailStatus],['excluded','sent','sent']);
    assert.equal(messages.length,2);
    const [notification, acknowledgement] = messages.splice(0);
    assert.deepEqual([notification.to,acknowledgement.to],[owner,visitor]);
    return {row,projection:enquiryRowToCrmPayload(row),notification};
  }
  for (const match of bundle.matchAll(/JSON\.stringify\(\{\.\.\.o,source:"([^"]+)"\}\)/g)) {
    const page = match[1];
    assert.ok(!pages.has(page));
    pages.add(page);
    const component = bundle.slice(bundle.lastIndexOf('function ',match.index),bundle.indexOf('function ',match.index));
    assert.ok(component.includes('src/pages/' + page + '.tsx'));
    const initial = component.match(/\[o,d\]=k\.useState\((\{[^}]*\})\)/)[1];
    const fields = vm.runInNewContext('(' + initial + ')');
    for (const key of Object.keys(fields)) fields[key] = 'fixture-' + key + '-' + pages.size + '-end';
    fields.email = visitor;
    const prepared = prepareBusinessQuote(null,fields,page);
    assert.equal(prepared.source,page);
    const {row,projection,notification} = await submit(prepared);
    for (const [key,value] of Object.entries(fields)) {
      const target = {name:'contactName',company:'businessName'}[key] ?? key;
      assert.equal(prepared[target],value);
      if (['contactName','businessName','phone','email','message','currentSupplier'].includes(target)) {
        assert.equal(row[target],value);
        assert.equal(projection[target],value);
        assert.ok(notification.text.includes(value) && notification.html.includes(value));
      } else {
        assert.ok(!JSON.stringify(row).includes(value));
        assert.ok(!JSON.stringify(projection).includes(value));
        assert.ok(!notification.text.includes(value) && !notification.html.includes(value));
        missing[key] = (missing[key] ?? 0) + 1;
      }
    }
    assert.equal(row.smsConsent,null);
    assert.equal(projection.smsConsent,null);
    const formComponent = component.match(/^function ([$\w]+)\(/)[1];
    const matches = routes.filter(route => route.body.includes('e.jsx(' + formComponent + ',{})'));
    assert.equal(matches.length,1);
    assert.equal(prepared.sourcePage,matches[0].path);
    assert.equal(row.sourcePage,matches[0].path);
    assert.equal(projection.sourcePage,matches[0].path);
  }
  assert.equal(pages.size,19);
  assert.deepEqual(missing,{annualUsage:1,postcode:17,contractEndDate:18,industry:1,
    annualElectricity:4,annualGas:4,sites:4});
  // Distinct input, never a replay. Attribution uses the existing canonical field.
  const fromPage = '/business-energy-quotes';
  const control = await submit({businessName:'Fixture',contactName:'Fixture',email:visitor,sourcePage:fromPage});
  assert.equal(control.row.sourcePage,fromPage);
  assert.equal(control.projection.sourcePage,fromPage);
  assert.equal(await query([], 'SELECT COUNT(*) FROM enquiries'),'20');
  assert.equal(fetchCount(),0);
  assert.equal(crmCalls,0);
  console.info('PASS 19 page mappings and one sourcePage control', missing);
}
