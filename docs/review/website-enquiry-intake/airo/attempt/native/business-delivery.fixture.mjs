// Run only with the isolated database fixtures. Both mail and HTTP are injected.
import assert from 'node:assert/strict';
import {createReceiver} from '../../../source/receiver.ts';
import {PATH} from '../../../source/contract.ts';
import {createQuoteCrmStep} from '../handoff.ts';

export async function verifyBusinessDelivery({
  shared, verifiedEnquiry, readWebsite, mapRow, setEmail, setStep, attemptStore, crm, owner, visitor,
}) {
  const endpoint = 'https://crm.example.invalid' + PATH;
  const now = () => 1800000000000;
  const key = 'fixture-only-key-for-isolated-business-delivery';
  const businessAnswers = {contractEndDate:'around March', sites:'2-5'};
  const scenarios = [
    {name:'shared', state:'excluded', calls:0},
    {name:'absent', state:'pending', calls:0},
    {name:'received', state:'sent', calls:1},
    {name:'lost', state:'uncertain', calls:1},
    {name:'healthCheck', state:'sent', calls:1},
  ];
  for (const [index, scenario] of scenarios.entries()) {
    const submissionId = '00000000-0000-4000-8000-00000000144' + index;
    const healthCheck = scenario.name === 'healthCheck';
    const answers = healthCheck
      ? {postcode:'AA1 1AA', energyType:'both', contractEnd:'around March', annualSpend:'fixture spend band'}
      : businessAnswers;
    const body = {submissionId, businessName:'Synthetic business ' + index, contactName:'Fixture contact',
      email:visitor, message:'Original fixture message', ...answers, sourcePage:healthCheck ? '/business-energy-health-check' : '/business-energy-quotes'};
    const emails = [];
    const attempts = [];
    const outcomes = [];
    setEmail(async message => { emails.push(message.to); });
    const receiver = createReceiver({key, now, save:crm.save});
    const step = createQuoteCrmStep({store:attemptStore, client:{
      endpoint:scenario.name === 'absent' ? null : endpoint, approvedEndpoint:endpoint, now, key,
      async transport(url, init) {
        const before = await readWebsite(submissionId);
        const response = await receiver(new Request(url, init));
        attempts.push({before, url, code:response.status, receipt:await response.clone().json()});
        if (scenario.name === 'lost') throw Error('Synthetic response lost after commit');
        return response;
      },
    }});
    setStep(async (...args) => {
      const outcome = await step(...args);
      outcomes.push(outcome);
      return outcome;
    });

    const handler = scenario.name === 'shared' ? shared : verifiedEnquiry;
    const res = {status(code) { this.code = code; return this; }, json(value) { this.body = value; }};
    await handler({body}, res);
    assert.equal(res.code, 201);
    assert.deepEqual(res.body, {ok:true, submissionId, created:true});
    const saved = await readWebsite(submissionId);
    assert.deepEqual([saved.ownerEmailStatus, saved.visitorEmailStatus, saved.crmStatus],
      ['sent', 'sent', scenario.state]);
    const mapped = mapRow(saved);
    assert.deepEqual(mapped.businessAnswers, answers);
    assert.equal(mapped.message, body.message);
    assert.equal(mapped.sourcePage, body.sourcePage);
    assert.equal(mapped.smsConsent, null);
    if (scenario.calls) {
      assert.equal(attempts.length, 1);
      const [{before, url, code, receipt}] = attempts;
      assert.deepEqual([before.ownerEmailStatus, before.visitorEmailStatus, before.crmStatus],
        ['sent', 'sent', 'uncertain']);
      assert.equal(url, endpoint);
      assert.equal(code, 201);
      const leadId = await crm.verifyLead({...body, businessAnswers:answers});
      assert.deepEqual(receipt, {version:1, outcome:'created', submissionId, leadId});
      assert.deepEqual(await crm.inspectReceipt(mapped), {matches:true, linked:true, audits:1});
    } else {
      await crm.verifyAbsent(submissionId);
    }
    assert.equal(attempts.length, scenario.calls);
    assert.deepEqual(emails, [owner, visitor]);
    const expectedOutcomes = {shared:[], absent:['pending'], received:['sent'], lost:['reconcile'], healthCheck:['sent']};
    assert.deepEqual(outcomes, expectedOutcomes[scenario.name]);
    console.log('# Business enquiry ' + scenario.name + ': website=' + saved.crmStatus +
      ', mock emails=2, CRM attempts=' + attempts.length);
  }
}
