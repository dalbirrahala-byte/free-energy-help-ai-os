import {createStore} from './store.ts';
import type {QueryResult} from './store.ts';

/** Server-only integration seam. openFresh must return an already connected,
 * NEW physical PostgreSQL session exclusively owned by this operation. No pool
 * release(), enclosing transaction, browser client or default connector here.
 * query must expose the server command tag; end must close the physical session.
 * Driver, target, restricted role, TLS and runtime authorization remain external
 * reviewed prerequisites. This archive does not read credentials or open sockets.
 */
export interface OwnedPostgresConnection {
  query(sql: string, values?: unknown[]): Promise<QueryResult & {command: string}>;
  end(): Promise<void>;
}

// Across factories in this module instance as well as concurrent invocations.
// Cannot detect distinct wrappers around the same socket: the opener must prove
// exclusive physical ownership. A rejected reused handle is never closed here.
const used = new WeakSet<OwnedPostgresConnection>();

export function createCommittedPostgresStore(
  openFresh: () => Promise<OwnedPostgresConnection>,
) {
  return createStore(async (sql, values) => {
    let connection: OwnedPostgresConnection;
    try {
      connection = await openFresh();
      if (!connection || typeof connection !== 'object' || used.has(connection)) {
        throw new Error('invalid ownership');
      }
      used.add(connection);
    } catch {
      throw new Error('CRM persistence unavailable');
    }
    try {
      // A waiting duplicate must see the receipt committed by the first writer.
      const started = await connection.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      if (started.command !== 'BEGIN') throw new Error('transaction not begun');
      const result = await connection.query(sql, [...values]);
      // SELECT completion is not a committed receipt. A rejected COMMIT or a
      // ROLLBACK command tag must never be promoted to success or retried.
      const committed = await connection.query('COMMIT');
      if (committed.command !== 'COMMIT') throw new Error('commit unconfirmed');
      return result;
    } catch {
      throw new Error('CRM persistence indeterminate');
    } finally {
      // No further SQL/retry after uncertainty. Closing an exclusively owned
      // session rolls back any uncommitted transaction; never return it to a pool.
      try { await connection.end(); }
      catch { throw new Error('CRM persistence cleanup uncertain'); }
    }
  });
}
