import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { ingestMetaLeadAcknowledgements } from './ingestMetaLeadAcknowledgement.server.ts';

const config = { appSecret: 'synthetic-app-secret', pageId: '123456', formId: '654321' };
const eventTime = 1793360000;
const raw = Buffer.from(JSON.stringify({ object: 'page', entry: [{ id: config.pageId, changes: [{
  field: 'leadgen', value: { page_id: config.pageId, form_id: config.formId, leadgen_id: '999999', created_time: eventTime },
}] }] }));
const signature = `sha256=${createHmac('sha256', config.appSecret).update(raw).digest('hex')}`;
const details = () => ({ id: '999999', form_id: config.formId, created_time: new Date(eventTime * 1000).toISOString(),
  field_data: [ { name: 'email', values: ['test@example.invalid'] },
    { name: 'phone_number', values: ['07700900001'] }, { name: 'full_name', values: ['Synthetic Lead'] },
    { name: 'unneeded_private_data', values: ['must not persist'] } ], hasExplicitConsentEvidence: true });

test('verified event and matching details reserve through the atomic ingestor only', async () => {
  let calls = 0;
  const result = await ingestMetaLeadAcknowledgements(raw, signature, config, async () => details(), {
    async rpc(name, args) {
      calls++;
      assert.equal(name, 'ingest_meta_lead_with_acknowledgement');
      assert.equal(args.p_form_id, config.formId);
      assert.equal(args.p_external_lead_id, '999999');
      assert.equal(args.p_telephone, '07700900001');
      assert.equal(Object.keys(args).length, 9);
      assert.ok(!JSON.stringify(args).includes('must not persist'));
      assert.ok(!JSON.stringify(args).includes('Consent'));
      return { data: [{ outcome: 'accepted', lead_id: 1, acknowledgement_reserved: true }], error: null };
    },
  });
  assert.deepEqual(result, { status: 'persisted', accepted: 1, duplicates: 0, executionAllowed: false });
  assert.equal(calls, 1);
});

test('signature failure never reads Graph details or writes to the CRM', async () => {
  const no = async () => { throw Error('must not call'); };
  const result = await ingestMetaLeadAcknowledgements(raw, 'sha256=' + '0'.repeat(64), config, no, { rpc: no });
  assert.equal(result.status, 'rejected');
});

for (const mutate of [
  (d: ReturnType<typeof details>) => { d.id = '888888'; },
  (d: ReturnType<typeof details>) => { d.form_id = '777777'; },
  (d: ReturnType<typeof details>) => { d.created_time = new Date((eventTime + 1) * 1000).toISOString(); },
  (d: ReturnType<typeof details>) => { d.field_data.push({ name: 'phone_number', values: ['07700900002'] }); },
  (d: ReturnType<typeof details>) => { d.field_data[0].values.push('another@example.invalid'); },
]) {
  test('mismatched or ambiguous Graph detail is rejected before persistence', async () => {
    const d = details(); mutate(d); let writes = 0;
    const result = await ingestMetaLeadAcknowledgements(raw, signature, config, async () => d, {
      async rpc() { writes++; return { data: null, error: null }; },
    });
    assert.equal(result.status, 'rejected'); assert.equal(writes, 0);
  });
}

test('duplicate receipt is not a new reservation', async () => {
  const result = await ingestMetaLeadAcknowledgements(raw, signature, config, async () => details(), {
    async rpc() { return { data: [{ outcome: 'duplicate', lead_id: 1, acknowledgement_reserved: false }], error: null }; },
  });
  assert.deepEqual(result, { status: 'persisted', accepted: 0, duplicates: 1, executionAllowed: false });
});

for (const data of [null, [], [{}], [{ outcome: 'accepted', lead_id: 1, acknowledgement_reserved: false }],
  [{ outcome: 'accepted', lead_id: 1, acknowledgement_reserved: true }, {}]]) {
  test('ambiguous persistence requests safe deduplicated intake retry, never a send', async () => {
    const result = await ingestMetaLeadAcknowledgements(raw, signature, config, async () => details(), {
      async rpc() { return { data, error: null }; },
    });
    assert.equal(result.status, 'retry_required'); assert.equal(result.executionAllowed, false);
  });
}

test('provider exceptions remain redacted', async () => {
  const result = await ingestMetaLeadAcknowledgements(raw, signature, config, async () => { throw Error('secret contact token'); }, {
    async rpc() { throw Error('must not call'); },
  });
  assert.deepEqual(result, { status: 'retry_required', accepted: 0, duplicates: 0, executionAllowed: false });
});
