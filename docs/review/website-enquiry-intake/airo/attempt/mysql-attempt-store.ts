import type {AttemptStore} from './handoff.ts';

/** Future mysql2 adapter must await statement COMMIT (autocommit connection,
 * never an enclosing uncommitted transaction) before resolving this function.
 * No connection, credentials, DDL or transport is created by this candidate.
 */
export type Execute = (sql: string, values: readonly string[]) => Promise<unknown>;
export const CLAIM_SQL = "UPDATE enquiries SET crm_status = 'uncertain' WHERE submission_id = ? AND crm_status = 'pending'";
export const FINISH_SQL = "UPDATE enquiries SET crm_status = ? WHERE submission_id = ? AND crm_status = 'uncertain'";

function exactlyOne(result: unknown): boolean {
  if (!Array.isArray(result) || result.length !== 2) return false;
  const header = result[0];
  return !!header && typeof header === 'object' && header.affectedRows === 1;
}
export function createMysqlAttemptStore(execute: Execute): AttemptStore {
  return {
    claim: async id => exactlyOne(await execute(CLAIM_SQL, [id])),
    finish: async (id, state) => exactlyOne(await execute(FINISH_SQL, [state, id])),
  };
}
