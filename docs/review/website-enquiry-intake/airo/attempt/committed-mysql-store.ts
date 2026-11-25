import {createMysqlAttemptStore} from './mysql-attempt-store.ts';
import type {AttemptStore} from './handoff.ts';

/** Inject a NEW, exclusively owned mysql2 connection per operation, never a
 * shared connection or one borrowed from an enclosing transaction. No runtime
 * factory/configuration is supplied here. Connections are destroyed, not pooled.
 */
export interface OwnedConnection {
  beginTransaction(): Promise<unknown>;
  execute(sql: string, values: string[]): Promise<unknown>;
  commit(): Promise<unknown>;
  destroy(): void;
}
export function createCommittedMysqlAttemptStore(
  openFresh: () => Promise<OwnedConnection>,
): AttemptStore {
  const used = new WeakSet<OwnedConnection>();
  return createMysqlAttemptStore(async (sql, values) => {
    let connection: OwnedConnection;
    try {
      connection = await openFresh();
      if (!connection || typeof connection !== 'object' || used.has(connection)) {
        throw new Error('invalid connection ownership');
      }
      used.add(connection);
    } catch {
      // Do not destroy a reused connection that another invocation may own.
      throw new Error('CRM persistence unavailable');
    }
    try {
      await connection.beginTransaction();
      const result = await connection.execute(sql, [...values]);
      // Statement completion alone is insufficient. Lost COMMIT acknowledgement
      // rejects this call, even if the server committed. Never retry or reset.
      await connection.commit();
      return result;
    } catch {
      throw new Error('CRM persistence indeterminate');
    } finally {
      // Discard on every outcome. Server rolls back an uncommitted transaction
      // when this dedicated connection closes; no further SQL is attempted.
      try { connection.destroy(); }
      catch { throw new Error('CRM persistence cleanup uncertain'); }
    }
  });
}
