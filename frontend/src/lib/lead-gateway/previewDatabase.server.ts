import 'server-only';
import postgres from 'postgres';
import {SUPABASE_DATABASE_CA} from './supabaseCa.server.ts';
import {isGoogleReceiverEnabled} from './googleReceiverConfiguration.server.ts';

export const ACK_STAGING_PROJECT = 'vredwhyphrhsudggrsen';
type Kind = 'ingestor' | 'worker' | 'receiver' | 'callback' | 'permission' | 'authorizer';
type Value = string | number | null;
type Row = Record<string, unknown>;
type Transaction = { unsafe(query: string, args?: Value[]): PromiseLike<Row[]> };
type Pool = { begin<T>(work: (tx: Transaction) => Promise<T>): Promise<T>; end(): Promise<void> };
type Configuration = Readonly<{
  host: string; port: number; database: string; username: string; password: string;
  ssl: { rejectUnauthorized: true; ca: string; servername: string }; prepare: false; max: 1; connect_timeout: 10;
  idle_timeout: 10; max_lifetime: 60; debug: false; onnotice: () => void;
}>;
type Definition = { kind: Kind; keys: readonly string[]; types: readonly string[]; rows: boolean; schema?: 'feh_ack_authority_private' };
const definitions: Record<string, Definition> = {
  select_enquiry: { kind: 'authorizer', schema: 'feh_ack_authority_private', keys: ['p_allowed_phone'], types: ['text'], rows: true },
  record_permission: { kind: 'permission', schema: 'feh_ack_authority_private', keys: ['p_binding_id','p_lead_id','p_submitted_at','p_question_key','p_answer'], types: ['uuid','bigint','timestamptz','text','text'], rows: false },
  authorize_enquiry: { kind: 'authorizer', schema: 'feh_ack_authority_private', keys: ['p_lead_id','p_allowed_phone'], types: ['bigint','text'], rows: true },
  record_acknowledgement_callback: { kind: 'callback', keys: ['p_event_id','p_message_id','p_profile_id','p_occurred_at','p_event_type','p_delivery_status','p_from','p_to'], types: ['uuid','uuid','uuid','timestamptz','text','text','text','text'], rows: false },
  ingest_external_lead: { kind: 'receiver', keys: ['p_provider','p_external_lead_id','p_provider_created_at','p_consent_status','p_company_name','p_contact_name','p_telephone','p_email','p_utm_campaign'], types: ['text','text','timestamptz','text','text','text','text','text','text'], rows: true },
  select_lead_acknowledgement_candidate: { kind: 'worker', keys: ['p_allowed_phone'], types: ['text'], rows: true },
  ingest_google_lead_with_acknowledgement: { kind: 'ingestor', keys: ['p_form_id','p_campaign_id','p_external_lead_id','p_provider_created_at','p_company_name','p_contact_name','p_telephone','p_email'], types: ['text','text','text','timestamptz','text','text','text','text'], rows: true },
  ingest_meta_lead_with_acknowledgement: { kind: 'ingestor', keys: ['p_page_id','p_form_id','p_external_lead_id','p_provider_created_at','p_company_name','p_contact_name','p_telephone','p_email','p_campaign_id','p_contract_end_answer','p_monthly_spend_answer'], types: ['text','text','text','timestamptz','text','text','text','text','text','text','text'], rows: true },
  claim_meta_lead_acknowledgement: { kind: 'worker', keys: ['p_lead_id','p_execution_authorization_id','p_provider_adapter_id'], types: ['bigint','bigint','bigint'], rows: true },
  consume_execution_authorization: { kind: 'worker', keys: ['p_execution_authorization_id'], types: ['bigint'], rows: false },
  prepare_execution_dispatch: { kind: 'worker', keys: ['p_execution_authorization_id','p_provider_adapter_id'], types: ['bigint','bigint'], rows: true },
  evaluate_execution_precall_readiness: { kind: 'worker', keys: ['p_execution_dispatch_attempt_id','p_execution_authorization_id','p_expected_provider_adapter_id','p_expected_adapter_key'], types: ['bigint','bigint','bigint','text'], rows: false },
  complete_execution_dispatch_success: { kind: 'worker', keys: ['p_execution_dispatch_attempt_id','p_provider_reference'], types: ['bigint','text'], rows: false },
  complete_execution_dispatch_failure: { kind: 'worker', keys: ['p_execution_dispatch_attempt_id','p_failure_code'], types: ['bigint','text'], rows: false },
  complete_execution_dispatch_indeterminate: { kind: 'worker', keys: ['p_execution_dispatch_attempt_id','p_failure_code'], types: ['bigint','text'], rows: false },
};
const identities = {
  permission: { login: 'feh_ack_permission_recorder', role: 'feh_ack_permission_recorder' },
  authorizer: { login: 'feh_ack_rule_authorizer', role: 'feh_ack_rule_authorizer' },
  callback: { login: 'feh_ack_preview_callback', role: 'feh_ack_preview_callback' },
  ingestor: { login: 'feh_ack_preview_ingestor', role: 'external_lead_ingestor' },
  worker: { login: 'feh_ack_preview_worker', role: 'execution_dispatch_worker' },
  receiver: { login: 'feh_intake_preview_receiver', role: 'feh_intake_preview_receiver' },
} as const;
const unavailable = () => ({ data: null, error: { code: 'ACK_DATABASE_UNAVAILABLE' } });

/** Credentials never leave this server-only module; URLs cannot select production,
 * an administrator, an arbitrary host, SSL options or another database. */
export function readPreviewDatabaseConfiguration(kind: Kind, environment: Readonly<Record<string,string | undefined>>): Configuration | null {
  const edge = environment.VERCEL_ENV === undefined && environment.FEH_INTAKE_RUNTIME === 'supabase-edge' &&
    environment.SUPABASE_URL === `https://${ACK_STAGING_PROJECT}.supabase.co` && environment.FEH_INTAKE_RECEIVER_ENABLED === 'true';
  const preview = environment.FEH_INTAKE_RUNTIME === undefined && environment.VERCEL_ENV === 'preview';
  const google = isGoogleReceiverEnabled(environment);
  // Edge form intake may use the EXISTING restricted ingestor identity. Never
  // admit the worker identity in this public receiver runtime.
  const validRuntime = kind === 'receiver' ? edge || google
    : preview || (['ingestor','permission'].includes(kind) && (google || edge && environment.FEH_META_FORM_TEST_ENABLED === 'true'));
  if (!Object.hasOwn(identities, kind) || !validRuntime ||
      environment.FEH_ACK_DATABASE_ENABLED !== 'true' ||
      environment.NEXT_PUBLIC_SUPABASE_URL !== `https://${ACK_STAGING_PROJECT}.supabase.co`) return null;
  try {
    if (kind === 'receiver' && !google && environment.FEH_INTAKE_RECEIVER_ENABLED !== 'true') return null;
    if (kind === 'callback' && environment.FEH_ACK_CALLBACK_ENABLED !== 'true') return null;
    if (kind === 'permission' && environment.FEH_ACK_PERMISSION_CAPTURE_ENABLED !== 'true') return null;
    if (kind === 'authorizer' && environment.FEH_ACK_AUTOMATIC_ENABLED !== 'true') return null;
    const value = environment[kind === 'permission' ? 'FEH_ACK_PERMISSION_DATABASE_URL' : kind === 'authorizer' ? 'FEH_ACK_AUTHORIZER_DATABASE_URL' : kind === 'callback' ? 'FEH_ACK_CALLBACK_DATABASE_URL' : kind === 'receiver' ? 'FEH_INTAKE_RECEIVER_DATABASE_URL' : kind === 'ingestor' ? 'FEH_ACK_INGESTOR_DATABASE_URL' : 'FEH_ACK_WORKER_DATABASE_URL'];
    if (!value || value.length > 2048) return null;
    const url = new URL(value);
    const login = identities[kind].login;
    const direct = url.hostname === `db.${ACK_STAGING_PROJECT}.supabase.co`;
    const pooler = url.hostname === 'aws-1-eu-central-1.pooler.supabase.com';
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash ||
        url.pathname !== '/postgres' || (!direct && !pooler) ||
        username !== (direct ? login : `${login}.${ACK_STAGING_PROJECT}`) ||
        (direct ? url.port !== '5432' : url.port !== '6543') ||
        !/^[\x21-\x7e]{32,256}$/.test(password)) return null;
    return Object.freeze({host: url.hostname, port: Number(url.port), database: 'postgres', username, password,
      ssl: {rejectUnauthorized: true as const, ca: SUPABASE_DATABASE_CA, servername: url.hostname}, prepare: false as const, max: 1 as const,
      connect_timeout: 10 as const, idle_timeout: 10 as const, max_lifetime: 60 as const,
      debug: false as const, onnotice: () => undefined});
  } catch { return null; }
}

/** Fixed SQL/RPC allowlist. Each call binds its restricted role inside one
 * transaction, so role state cannot leak across pooled requests. No SQL retry. */
export function createPreviewAcknowledgementDatabase(
  kind: Kind,
  environment: Readonly<Record<string,string | undefined>> = process.env,
  connect: (config: Configuration) => Pool = config => {
    const sql = postgres(config);
    return {begin: work => sql.begin(tx => work({unsafe: (query, args = []) => tx.unsafe(query,args)})) as Promise<Awaited<ReturnType<typeof work>>>,
      end: () => sql.end({timeout: 5})};
  },
) {
  const configuration = readPreviewDatabaseConfiguration(kind, environment);
  if (!configuration) return null;
  const identity = identities[kind];
  const googleOnly = environment.FEH_INTAKE_RUNTIME === 'supabase-google';
  let pool: Pool;
  try { pool = connect(configuration); } catch { return null; }
  let verificationFailure: string | null = null;
  async function bindIdentity(tx: Transaction) {
    await tx.unsafe(kind === 'callback' ? "set local statement_timeout = '1500ms'" : "set local statement_timeout = '10s'");
    await tx.unsafe(kind === 'callback' ? "set local lock_timeout = '750ms'" : "set local lock_timeout = '3s'");
    await tx.unsafe(`set local role ${identity.role}`);
    const check = await tx.unsafe(`select current_user as role, session_user as login, current_database() as database,
      r.rolsuper or r.rolbypassrls or r.rolcreaterole or r.rolcreatedb or r.rolreplication
        or login.rolsuper or login.rolbypassrls or login.rolcreaterole or login.rolcreatedb or login.rolreplication
        or exists (select 1 from pg_catalog.pg_auth_members m where m.member in (r.oid,login.oid)
          and (m.member = r.oid or m.roleid <> r.oid or m.admin_option or m.inherit_option or not m.set_option))
        as elevated,
      (has_table_privilege(current_user,'public.lead_acknowledgements','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
        or has_table_privilege(session_user,'public.lead_acknowledgements','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')) as raw_queue_access
      ${kind === 'callback' ? ", has_table_privilege(current_user,'public.suppression_records','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') as raw_suppression_access" : ''}
      from pg_catalog.pg_roles r join pg_catalog.pg_roles login on login.rolname=session_user where r.rolname=current_user`);
    if (check.length !== 1 || check[0].role !== identity.role || check[0].login !== identity.login ||
        check[0].database !== 'postgres' || check[0].elevated !== false || check[0].raw_queue_access !== false) throw new Error('identity');
    if (kind === 'callback' && check[0].raw_suppression_access !== false) throw new Error('identity');
  }
  return Object.freeze({
    /** Read-only connection proof; returns no credentials, records or SQL errors. */
    async verifyConnection() {
      try {
        await pool.begin(async tx => {
          await tx.unsafe('set transaction read only');
          await bindIdentity(tx);
        });
        verificationFailure = null;
        return true;
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
        const allowed = ['28P01','28000','42501','53300','XX000','ENOTFOUND','ECONNREFUSED','CONNECT_TIMEOUT',
          'CONNECTION_CLOSED','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','CERT_HAS_EXPIRED'];
        verificationFailure = typeof code === 'string' && allowed.includes(code) ? code
          : error instanceof Error && error.message === 'identity' ? 'IDENTITY_MISMATCH' : 'UNAVAILABLE';
        return false;
      }
    },
    verificationFailure() { return verificationFailure; },
    async rpc(name: string, args: Record<string,unknown> = {}) {
      // The stable Google runtime cannot reuse this shared module for Meta,
      // execution, approval, STOP or unrestricted provider attribution.
      if (googleOnly &&
          !(kind === 'permission' && name === 'record_permission' || kind === 'ingestor' && name === 'ingest_google_lead_with_acknowledgement' ||
            kind === 'receiver' && name === 'ingest_external_lead' && args?.p_provider === 'google_ads')) return unavailable();
      if (!Object.hasOwn(definitions,name)) return unavailable();
      const definition = definitions[name];
      if (definition.kind !== kind || !args || Object.keys(args).some(k => !definition.keys.includes(k))) return unavailable();
      const values: Value[] = [];
      for (const [index,key] of definition.keys.entries()) {
        const value = args[key] ?? null;
        if (definition.types[index] === 'bigint') {
          if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return unavailable();
        } else if (value !== null && (typeof value !== 'string' || value.length > 1000 || value.includes('\0'))) return unavailable();
        values.push(value as Value);
      }
      try {
        const data = await pool.begin(async tx => {
          await bindIdentity(tx);
          const parameters = definition.types.map((type,index) => `$${index+1}::${type}`).join(',');
          // Function and types were selected from a closed source allowlist.
          const statement = definition.rows
            ? `select to_jsonb(result) as result from ${definition.schema ?? 'public'}.${name}(${parameters}) as result`
            : `select to_jsonb(${definition.schema ?? 'public'}.${name}(${parameters})) as result`;
          const rows = await tx.unsafe(statement,values);
          if (definition.rows) return rows.map(row => row.result);
          if (rows.length !== 1) throw new Error('result');
          return rows[0].result;
        });
        return {data, error: null};
      } catch { return unavailable(); } // Never propagate DB messages, parameters or connection strings.
    },
    async close() { try { await pool.end(); } catch { /* no credentials in shutdown errors */ } },
  });
}
