import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommittedMysqlAttemptStore } from './committed-mysql-store.ts';
import { createOwnedMysqlOpener } from './owned-mysql-opener.ts';

const target = { host: 'website-db.example.invalid', port: 3306, database: 'fictional_enquiries' };
const settings = { ...target, user: 'synthetic_account', password: 'fixture-only' };
const submissionId = '00000000-0000-4000-8000-000000000001';

test('claim and finish each use a distinct connection for the approved database', async () => {
  const calls = [];
  const opener = createOwnedMysqlOpener(target, () => settings, async options => {
    assert.deepEqual(options, { ...settings, ssl: { rejectUnauthorized: true, verifyIdentity: true } });
    const connectionNumber = calls.filter(([, operation]) => operation === 'open').length + 1;
    calls.push([connectionNumber, 'open']);
    return {
      async beginTransaction() { calls.push([connectionNumber, 'begin']); },
      async execute() { calls.push([connectionNumber, 'execute']); return [{ affectedRows: 1 }, []]; },
      async commit() { calls.push([connectionNumber, 'commit']); },
      destroy() { calls.push([connectionNumber, 'destroy']); },
    };
  });
  assert.deepEqual(calls, []);
  const store = createCommittedMysqlAttemptStore(opener);
  assert.equal(await store.claim(submissionId), true);
  assert.equal(await store.finish(submissionId, 'sent'), true);
  assert.deepEqual(calls, [1, 2].flatMap(id =>
    ['open', 'begin', 'execute', 'commit', 'destroy'].map(step => [id, step])));
});

test('missing credentials and a different host, port or database stop before opening', async () => {
  let connections = 0;
  const connect = async () => { connections++; throw new Error('unexpected connection'); };
  for (const changed of [
    { user: '' }, { password: undefined }, { password: '' },
    { host: 'different.example.invalid' }, { port: 3307 }, { database: 'other_database' },
  ]) {
    const store = createCommittedMysqlAttemptStore(
      createOwnedMysqlOpener(target, () => ({ ...settings, ...changed }), connect),
    );
    await assert.rejects(store.claim(submissionId), /^Error: CRM persistence unavailable$/);
  }
  assert.equal(connections, 0);
});

test('a connector failure is redacted and does not trigger another attempt', async () => {
  let connections = 0;
  const opener = createOwnedMysqlOpener(target, () => settings, async () => {
    connections++;
    throw new Error('fixture driver detail');
  });
  const store = createCommittedMysqlAttemptStore(opener);
  await assert.rejects(store.claim(submissionId), /^Error: CRM persistence unavailable$/);
  assert.equal(connections, 1);
});
