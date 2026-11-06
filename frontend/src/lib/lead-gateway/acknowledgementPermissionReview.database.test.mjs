import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { ACK_PERMISSION_PROPOSAL as proposal } from './acknowledgementPermissionReview.ts';
const hook = registerHooks({ resolve(s, c, next) { return s === 'server-only' ? { url: 'data:text/javascript,export{}', shortCircuit: true } : next(s, c); } });
const { readPermissionReview, approvePermissionReview, recordMockPermission, isPermissionReviewPreview } = await import('./acknowledgementPermissionReview.server.ts');
hook.deregister();
const db = new PGlite();
const actor = '00000000-0000-4000-8000-000000000456';
const other = '00000000-0000-4000-8000-000000000457';
const testId = '00000000-0000-4000-8000-000000000789';
const issuer = 'https://vredwhyphrhsudggrsen.supabase.co/auth/v1';
const bootstrap = await readFile(new URL('../../../../docs/staging/ACK_OWNER_TEST_BOOTSTRAP.sql.in', import.meta.url), 'utf8');
before(async () => {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges in schema public grant all on functions to anon,authenticated,service_role;`);
  const directory = new URL('../../../../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, directory), 'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)', [actor, other]);
  await db.query("insert into user_roles(id,role) values($1,'read_only'),($2,'admin')", [actor, other]);
});
after(() => db.close());
const reset = Symbol('rollback local synthetic fixture');
const keys = { get_ack_permission_review: [], approve_ack_permission_review: ['p_version'], record_ack_mock_permission: ['p_version', 'p_test_id', 'p_source', 'p_permission'] };
async function fixture(work) {
  try { await db.transaction(async tx => {
    const claims = { sub: actor, iss: issuer, role: 'authenticated', aal: 'aal2' };
    async function jwt(overrides = {}) { await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ ...claims, ...overrides })]); }
    await jwt();
    await tx.exec(bootstrap.replace('__OWNER_UUID__', actor).replace('__OWNER_PHONE__', '+447700900004').replace('__APPROVAL_REFERENCE__', 'owner-approved-staging-sms-synthetic_fixture_only'));
    await tx.query('select finish_ack_preview_owner_test()');
    assert.equal((await tx.query('select role from user_roles where id=$1', [actor])).rows[0].role, 'read_only');
    async function rpc(name, args = {}, role = 'authenticated') {
      assert.ok(Object.hasOwn(keys, name));
      await tx.exec('savepoint mock_review_rpc');
      try {
        await tx.exec(`set local role ${role}`);
        const data = (await tx.query(`select public.${name}(${keys[name].map((_, i) => `$${i + 1}`).join(',')}) as result`, keys[name].map(k => args[k]))).rows[0].result;
        await tx.exec('reset role; release savepoint mock_review_rpc');
        return { data, error: null };
      } catch (error) {
        await tx.exec('rollback to savepoint mock_review_rpc; release savepoint mock_review_rpc');
        throw error;
      }
    }
    const control = async () => (await tx.query(`select
      public.evaluate_execution_emergency_stop() as stop,
      (select count(*)::int from execution_authorisers where revoked_at is null) as grants,
      (select count(*)::int from execution_provider_adapters where status='approved') as adapters,
      (select count(*)::int from execution_authorizations) as authorizations,
      (select count(*)::int from execution_dispatch_attempts) as attempts,
      (select count(*)::int from lead_acknowledgements) as reservations,
      (select count(*)::int from leads) as leads`)).rows[0];
    const original = await control();
    await work({ tx, jwt, rpc, client: { rpc } });
    assert.deepEqual(await control(), original, 'review cannot change execution state or create leads');
    assert.equal(original.stop, 'stopped'); assert.equal(original.grants, 0); assert.equal(original.adapters, 0);
    throw reset;
  }); } catch (error) { if (error !== reset) throw error; }
}
const input = { version: proposal.version, testId, source: 'google', permission: 'yes' };

test('installation is dormant: no approvals, fixtures or direct table access', async () => {
  assert.equal((await db.query('select count(*)::int as n from feh_ack_review_private.rule_reviews')).rows[0].n, 0);
  for (const role of ['anon', 'authenticated', 'service_role', 'external_lead_ingestor', 'execution_dispatch_worker', 'feh_ack_preview_ingestor', 'feh_ack_preview_worker', 'feh_intake_preview_receiver']) {
    const { rows } = await db.query(`select has_schema_privilege($1,'feh_ack_review_private','USAGE') as schema_access,
      has_table_privilege($1,'feh_ack_review_private.rule_reviews','INSERT') as can_approve,
      has_table_privilege($1,'feh_ack_review_private.permission_fixtures','INSERT') as can_record`, [role]);
    assert.deepEqual(rows[0], { schema_access: false, can_approve: false, can_record: false });
  }
});
test('only exact staging Preview environment exposes the page', () => {
  assert.equal(isPermissionReviewPreview({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: issuer.replace('/auth/v1', '') }), true);
  for (const env of [{}, { VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: issuer.replace('/auth/v1', '') }, { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://production.invalid' }]) assert.equal(isPermissionReviewPreview(env), false);
});
test('owner can see exact pinned wording but cannot record before approval', () => fixture(async h => {
  assert.deepEqual((await h.rpc('get_ack_permission_review')).data.proposal, proposal);
  assert.deepEqual(await readPermissionReview(h.client), { status: 'ready', approvedAt: null, records: [] });
  assert.equal(await recordMockPermission(h.client, input), 'blocked');
  assert.equal((await h.rpc('record_ack_mock_permission', { p_version: proposal.version, p_test_id: testId, p_source: 'google', p_permission: 'yes' })).data, 'blocked');
}));
test('attributable owner approval is immutable and idempotent', () => fixture(async h => {
  assert.equal(await approvePermissionReview(h.client, 'caller-selected-version'), false);
  assert.equal(await approvePermissionReview(h.client, proposal.version), true);
  assert.equal(await approvePermissionReview(h.client, proposal.version), true);
  const rows = (await h.tx.query('select owner_id,proposal,scope from feh_ack_review_private.rule_reviews')).rows;
  assert.deepEqual(rows, [{ owner_id: actor, proposal, scope: 'fictional_staging_test_only' }]);
  assert.equal((await h.tx.query("select count(*)::int as n from audit_log where action='ack_mock_rule_reviewed'")).rows[0].n, 1);
  assert.ok((await readPermissionReview(h.client)).approvedAt);
}));
for (const permission of ['yes', 'no', 'not_sure']) test(`fictional ${permission} recorded once with replay protected and no live authority`, () => fixture(async h => {
  assert.equal(await approvePermissionReview(h.client, proposal.version), true);
  const submission = { ...input, permission };
  assert.equal(await recordMockPermission(h.client, submission), 'saved');
  assert.equal(await recordMockPermission(h.client, submission), 'duplicate');
  assert.equal(await recordMockPermission(h.client, { ...submission, source: 'meta' }), 'blocked');
  assert.equal(await recordMockPermission(h.client, { ...submission, permission: permission === 'yes' ? 'no' : 'yes' }), 'blocked');
  const state = await readPermissionReview(h.client);
  assert.equal(state.records.length, 1); assert.equal(state.records[0].permission, permission);
  const row = (await h.tx.query('select recorded_by,evidence_kind from feh_ack_review_private.permission_fixtures')).rows[0];
  assert.deepEqual(row, { recorded_by: actor, evidence_kind: 'synthetic_fixture' });
  assert.equal((await h.tx.query("select count(*)::int as n from audit_log where action='ack_mock_permission_recorded'")).rows[0].n, 1);
}));
for (const [name, changes] of Object.entries({ stranger: { sub: other }, production: { iss: 'https://production.invalid/auth/v1' }, weakSession: { aal: 'aal1' }, machine: { role: 'service_role' }, anonymous: { is_anonymous: true } })) {
  test(`${name} cannot read, approve or record`, () => fixture(async h => {
    await h.jwt(changes);
    assert.equal((await readPermissionReview(h.client)).status, 'blocked');
    assert.equal(await approvePermissionReview(h.client, proposal.version), false);
    assert.equal(await recordMockPermission(h.client, input), 'blocked');
    assert.equal((await h.rpc('approve_ack_permission_review', { p_version: proposal.version })).data, 'blocked');
    assert.equal((await h.rpc('record_ack_mock_permission', { p_version: proposal.version, p_test_id: testId, p_source: 'google', p_permission: 'yes' })).data, 'blocked');
  }));
}
test('anonymous and service roles cannot execute the review RPCs', () => fixture(async h => {
  for (const role of ['anon', 'service_role', 'external_lead_ingestor', 'execution_dispatch_worker', 'feh_ack_preview_ingestor', 'feh_ack_preview_worker', 'feh_intake_preview_receiver']) await assert.rejects(h.rpc('get_ack_permission_review', {}, role), /permission denied/);
}));
test('unknown permission, missing source and invalid ID cannot be upgraded to yes', () => fixture(async h => {
  await approvePermissionReview(h.client, proposal.version);
  for (const changes of [{ permission: null }, { permission: 'approved' }, { source: 'anything' }, { testId: 'bad' }, { version: '' }]) assert.equal(await recordMockPermission(h.client, { ...input, ...changes }), 'blocked');
  for (const permission of [null, '', 'approved']) assert.equal((await h.rpc('record_ack_mock_permission', { p_version: proposal.version, p_test_id: testId, p_source: 'google', p_permission: permission })).data, 'blocked');
}));
test('changed review snapshot blocks reuse', () => fixture(async h => {
  await approvePermissionReview(h.client, proposal.version);
  await h.tx.exec("update feh_ack_review_private.rule_reviews set proposal=proposal || '{\"message\":\"changed\"}'::jsonb");
  assert.equal((await readPermissionReview(h.client)).status, 'blocked');
  assert.equal(await approvePermissionReview(h.client, proposal.version), false);
  assert.equal(await recordMockPermission(h.client, input), 'blocked');
}));
test('audit failure rolls the fictional record back', () => fixture(async h => {
  await approvePermissionReview(h.client, proposal.version);
  await h.tx.exec(`create function public.reject_mock_audit() returns trigger language plpgsql as $$begin if new.action='ack_mock_permission_recorded' then raise exception 'synthetic audit failure'; end if; return new; end$$;
    create trigger reject_mock_audit before insert on public.audit_log for each row execute function public.reject_mock_audit();`);
  assert.equal(await recordMockPermission(h.client, input), 'blocked');
  assert.equal((await h.tx.query('select count(*)::int as n from feh_ack_review_private.permission_fixtures')).rows[0].n, 0);
}));
test('missing RPC, mismatched displayed proposal and exception fail closed without secret detail', async () => {
  for (const rpc of [async () => ({ data: null, error: 'private detail' }), async () => { throw Error('private detail'); }, async () => ({ data: { status: 'ready', proposal: { ...proposal, notice: 'different' }, approved_at: null, records: [] }, error: null })]) {
    assert.deepEqual(await readPermissionReview({ rpc }), { status: 'unavailable', approvedAt: null, records: [] });
  }
});
