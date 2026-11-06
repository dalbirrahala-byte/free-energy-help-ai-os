import 'server-only';
import { ACK_PERMISSION_PROPOSAL, isMockPermission, isMockSource, isMockTestId } from './acknowledgementPermissionReview.ts';

type Environment = Readonly<Record<string, string | undefined>>;
export function isPermissionReviewPreview(env: Environment): boolean {
  return env.VERCEL_ENV === 'preview' &&
    env.NEXT_PUBLIC_SUPABASE_URL === 'https://vredwhyphrhsudggrsen.supabase.co';
}

export type PermissionReviewRpc = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
export type MockPermissionRecord = {
  test_id: string;
  source: 'meta' | 'google';
  permission: 'yes' | 'no' | 'not_sure';
  recorded_at: string;
};
export type PermissionReviewState = {
  status: 'ready' | 'blocked' | 'unavailable';
  approvedAt: string | null;
  records: MockPermissionRecord[];
};
const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

export async function readPermissionReview(client: PermissionReviewRpc): Promise<PermissionReviewState> {
  const unavailable: PermissionReviewState = { status: 'unavailable', approvedAt: null, records: [] };
  try {
    const { data, error } = await client.rpc('get_ack_permission_review');
    if (error || !data || typeof data !== 'object') return unavailable;
    const row = data as Record<string, unknown>;
    if (row.status === 'blocked') return { ...unavailable, status: 'blocked' };
    // Pin the entire reviewed proposal, not only a caller-supplied version label.
    const proposal = row.proposal as Record<string, unknown> | undefined;
    if (row.status !== 'ready' || !proposal || proposal.version !== ACK_PERMISSION_PROPOSAL.version ||
      proposal.scope !== ACK_PERMISSION_PROPOSAL.scope || proposal.notice !== ACK_PERMISSION_PROPOSAL.notice ||
      proposal.message !== ACK_PERMISSION_PROPOSAL.message ||
      JSON.stringify(proposal.rules) !== JSON.stringify(ACK_PERMISSION_PROPOSAL.rules) ||
      !(row.approved_at === null || isTimestamp(row.approved_at)) || !Array.isArray(row.records) ||
      (row.approved_at === null && row.records.length > 0)) return unavailable;
    const records: MockPermissionRecord[] = [];
    for (const record of row.records) {
      if (!record || !isMockTestId(record.test_id) || !isMockSource(record.source) ||
        !isMockPermission(record.permission) || !isTimestamp(record.recorded_at)) return unavailable;
      records.push({ test_id: record.test_id, source: record.source, permission: record.permission, recorded_at: record.recorded_at });
    }
    return { status: 'ready', approvedAt: row.approved_at, records };
  } catch {
    return unavailable;
  }
}

export async function approvePermissionReview(client: PermissionReviewRpc, version: unknown): Promise<boolean> {
  if (version !== ACK_PERMISSION_PROPOSAL.version) return false;
  const state = await readPermissionReview(client);
  if (state.status !== 'ready') return false;
  try {
    const { data, error } = await client.rpc('approve_ack_permission_review', { p_version: version });
    return !error && data === 'approved_for_mock';
  } catch {
    return false;
  }
}

export async function recordMockPermission(
  client: PermissionReviewRpc, input: { version: unknown; testId: unknown; source: unknown; permission: unknown },
): Promise<'saved' | 'duplicate' | 'blocked'> {
  if (input.version !== ACK_PERMISSION_PROPOSAL.version || !isMockTestId(input.testId) ||
    !isMockSource(input.source) || !isMockPermission(input.permission)) return 'blocked';
  const state = await readPermissionReview(client);
  if (state.status !== 'ready' || !state.approvedAt) return 'blocked';
  try {
    const { data, error } = await client.rpc('record_ack_mock_permission', {
      p_version: input.version, p_test_id: input.testId, p_source: input.source, p_permission: input.permission,
    });
    return !error && (data === 'saved' || data === 'duplicate') ? data : 'blocked';
  } catch {
    return 'blocked';
  }
}
