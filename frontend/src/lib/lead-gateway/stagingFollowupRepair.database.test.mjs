import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const repair = await readFile(new URL('../../../../scripts/repair-staging-test-followups.sql', import.meta.url), 'utf8');
const expected = 'Review enquiry, verify contact permission and assign follow-up';
const identities = [
  ['google_ads', 'feh_owner_test_e3dcd841-8172-44b4-9a22-db00dcba2688'],
  ['google_ads', 'feh_google_receiver_20261101_1824'],
  ['google_ads', 'TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ-abcdefghijklmnopqrstuvwxyz-0123456789-AaBbCcDdEeFfGgHhIiJjKkLl'],
  ['meta', 'meta_dashboard_1121337167194437_444444444444'],
  ['meta', '1781907386353507'],
];
async function fixture(run) {
  const db = new PGlite();
  try {
    await db.exec(`create table leads(id bigint generated always as identity primary key,provider text,
      external_lead_id text,status text default 'New',lead_owner text,follow_up_date date,
      next_action text,follow_up_required boolean,consent_status text default 'unknown',notes text default 'synthetic');
      create table execution_control_events(id bigint,event_type text);
      insert into execution_control_events values(1,'STOP');
      create table execution_authorisers(revoked_at timestamptz);
      create table execution_provider_adapters(status text);
      create table audit_log(action text,actor_id uuid,actor_role text,entity_type text,entity_id text,
        correlation_id uuid,result text,metadata jsonb);`);
    for (const identity of [...identities, ['meta', 'unrelated_test_123456']])
      await db.query('insert into leads(provider,external_lead_id) values($1,$2)', identity);
    await run(db);
  } finally { await db.close(); }
}

test('repairs exactly five tests with one audit each; repeat is a no-op; unrelated lead is untouched', async () => fixture(async db => {
  await db.exec(repair);
  await db.exec(repair);
  const result = (await db.query(`select count(*)::int total,
    count(*) filter(where follow_up_required is true and next_action=$1)::int repaired,
    bool_and(lead_owner is null and follow_up_date is null and consent_status='unknown' and notes='synthetic') preserved
    from leads`, [expected])).rows[0];
  assert.deepEqual(result, { total: 6, repaired: 5, preserved: true });
  assert.equal((await db.query('select count(*)::int n from audit_log')).rows[0].n, 5);
  assert.deepEqual((await db.query('select next_action,follow_up_required from leads where id=6')).rows[0], { next_action: null, follow_up_required: null });
}));

for (const [name, mutation] of Object.entries({
  'changed staff action': "update leads set next_action='Already being handled' where id=1",
  'unknown action with explicit follow-up': 'update leads set follow_up_required=true where id=1',
  'explicit no follow-up': 'update leads set follow_up_required=false where id=1',
  'changed owner': "update leads set lead_owner='Synthetic staff' where id=1",
  'missing expected lead': 'delete from leads where id=1',
  'STOP released': "update execution_control_events set event_type='RELEASE'",
  'active grant': 'insert into execution_authorisers values(null)',
  'approved adapter': "insert into execution_provider_adapters values('approved')",
})) test(`repair fails atomically for ${name}`, async () => fixture(async db => {
  await db.exec(mutation);
  const before = (await db.query('select * from leads order by id')).rows;
  await assert.rejects(db.exec(repair));
  await db.exec('rollback');
  assert.deepEqual((await db.query('select * from leads order by id')).rows, before);
  assert.equal((await db.query('select count(*)::int n from audit_log')).rows[0].n, 0);
}));

test('audit failure rolls back all five updates', async () => fixture(async db => {
  await db.exec("alter table audit_log add constraint reject_test_audit check(action <> 'lead_follow_up_initialized')");
  await assert.rejects(db.exec(repair));
  await db.exec('rollback');
  assert.equal((await db.query('select count(*)::int n from leads where next_action is null and follow_up_required is null')).rows[0].n, 6);
}));
