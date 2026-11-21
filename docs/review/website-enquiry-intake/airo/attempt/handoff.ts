import {deliver} from '../../source/client.ts';
import type {ClientDependencies} from '../../source/client.ts';
import type {Payload} from '../../source/contract.ts';

export type Outcome = 'disabled' | 'pending' | 'held' | 'sent' | 'failed' | 'reconcile';
export interface AttemptStore {
  /** Atomic, committed pending -> uncertain; true only for exactly one changed row. */
  claim(id: string): Promise<boolean>;
  /** Atomic uncertain -> final; true only for exactly one changed row. */
  finish(id: string, state: 'sent' | 'failed'): Promise<boolean>;
}
export interface Dependencies { client: ClientDependencies; store: AttemptStore }

/** Dormant source candidate. No environment reads, transport defaults or retries.
 * `uncertain` is a conservative durable hold, not a claim that a request was sent.
 * Historical pending rows are never eligible: their previous attempt is unknown.
 */
export function createQuoteCrmStep(deps: Dependencies | null) {
  return async (id: string, isNew: boolean, status: string, map: () => Payload): Promise<Outcome> => {
    try {
      if (!deps) return 'disabled';
      if (!isNew || status !== 'pending') return 'held';
      const client = {...deps.client};
      if (!client.endpoint) return 'pending';
      const payload = map();
      if (payload.submissionId !== id) return 'reconcile';
      // No transport unless this specific caller has observed a committed claim.
      if (await deps.store.claim(id) !== true) return 'reconcile';
      const result = await deliver(payload, client);
      // Any ambiguous/absent/simulated result retains the durable uncertain hold.
      if (result.endpointAbsent || result.simulated || result.uncertain) return 'reconcile';
      const final = result.ok ? 'sent' : 'failed';
      if (await deps.store.finish(id, final) !== true) return 'reconcile';
      return final;
    } catch {
      // The claim may have committed even if its response threw. Never resend,
      // reset to pending, expose errors or interrupt the completed email journey.
      return 'reconcile';
    }
  };
}

// Source-only package is closed by default. A reviewed server bootstrap and
// separate scoped runtime authority are required before supplying dependencies.
export const finishQuoteCrm = createQuoteCrmStep(null);
