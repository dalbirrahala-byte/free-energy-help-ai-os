const {spawnSync} = await import('node:child_process');
const [guard, binary, data, libraries] = process.argv.slice(3);
assert.match(data, /^\/tmp\/feh133-combined-native\.[a-zA-Z0-9]+\/data$/);
const database = 'feh_synthetic_native';
const read = path => readFileSync(new URL('../website-enquiry-intake/' + path, import.meta.url), 'utf8');
const oneLine = sql => sql.split('\n').filter(line => !line.trimStart().startsWith('--')).join(' ');
function run(statements, dbName = database) {
  const result = spawnSync('/usr/bin/python3', [guard, binary, '--single', '-D', data,
    '-c', 'dynamic_library_path=' + libraries, dbName], {
    timeout: 15000, env: {}, encoding: 'utf8', input: statements.map(oneLine).join('\n') + '\n'
  });
  assert.equal(result.status, 0, String(result.error ?? result.stderr));
  assert.doesNotMatch(result.stderr, /\b(?:ERROR|FATAL|PANIC):/);
  assert.match(result.stdout, /PostgreSQL stand-alone backend 17\.11/);
  assert.doesNotMatch(result.stdout, /\b(?:ERROR|FATAL|PANIC):/);
  return [...result.stdout.matchAll(/fixture_result = "([0-9a-f]+)"/g)].map(match =>
    JSON.parse(Buffer.from(match[1], 'hex').toString('utf8')));
}
const literal = text => "convert_from(decode('" + Buffer.from(text).toString('hex') + "','hex'),'UTF8')";
const project = query => "select encode(convert_to(to_jsonb(row)::text,'UTF8'),'hex') as fixture_result from (" + query + ") as row;";
run(['CREATE DATABASE ' + database + ';'], 'postgres');
const schema = read('tests/postgres-local.sql');
run([
  schema.slice(schema.indexOf('DO $$ BEGIN\n IF NOT EXISTS'), schema.indexOf('\\ir')),
  read('source/website-enquiries.sql'),
  'CREATE ROLE fixture_writer NOLOGIN; GRANT EXECUTE ON FUNCTION public.ingest_website_enquiry(jsonb) TO fixture_writer;'
]);
const [identity] = run([project("select current_database() db, inet_server_addr() is null as local, current_setting('server_version_num') version")]);
assert.deepEqual(identity, {db: database, local: true, version: '170011'});
let committedReads = 0;
const db = {
  async query(statement, [reference]) {
    return {rows: run([project(statement.replace('$1', literal(reference) + '::uuid'))])};
  },
  async close() {}
};
const receiver = createReceiver({key, now: Date.now, save: async payload => {
  assert.equal(payload.submissionId, active.id);
  assert.equal(payload.smsConsent, active.expected);
  assert.deepEqual(payload.businessAnswers, active.answers);
  assert.equal(payload.sourcePage, '/free-business-energy-health-check');
  active.events.push('receiver');
  const json = literal(JSON.stringify(payload)) + '::jsonb';
  const [acl, {receipt}] = run([
    'BEGIN ISOLATION LEVEL READ COMMITTED;',
    'SET LOCAL ROLE fixture_writer;',
    project("select current_user as role, current_setting('transaction_isolation') as isolation, has_function_privilege('public.ingest_website_enquiry(jsonb)','execute') as ingest, has_table_privilege('public.leads','insert') as direct_insert, has_table_privilege('public.website_enquiry_receipts','select') as receipt_read"),
    project('select public.ingest_website_enquiry(' + json + ') as receipt'),
    'COMMIT;'
  ]);
  assert.deepEqual(acl, {role: 'fixture_writer', isolation: 'read committed', ingest: true, direct_insert: false, receipt_read: false});
  // Open a new stand-alone backend on the same disposable cluster after the writer exits.
  const [visible] = run([project(
    "select r.lead_id::text as lead_id, r.payload_sha256 = encode(sha256(convert_to((" + json + ")::text,'UTF8')),'hex') as digest_match, " +
    "exists (select from public.audit_log a where a.correlation_id=r.submission_id and a.entity_id=r.lead_id::text " +
    "and a.action='website_enquiry_received') as audit_match from public.website_enquiry_receipts r where r.submission_id=" +
    literal(payload.submissionId) + '::uuid'
  )]);
  assert.deepEqual(visible, {lead_id: receipt.leadId, digest_match: true, audit_match: true});
  committedReads++;
  return receipt;
}});
process.once('beforeExit', () => {
  assert.equal(committedReads, 3);
  console.log('PASS 3 committed native receipts verified by a fresh backend before HTTP success');
});
