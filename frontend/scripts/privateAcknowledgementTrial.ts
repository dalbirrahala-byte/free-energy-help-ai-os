import {isBoundedTestWindowOpen} from '../src/lib/lead-gateway/boundedTestWindow.ts';
import {randomUUID} from 'node:crypto';
import {runNextAutomaticAcknowledgementOnce} from '../src/lib/execution-dispatch/runAutomaticAcknowledgementOnce.ts';
import type {AcknowledgementWorkerDatabase} from '../src/lib/execution-dispatch/runLeadAcknowledgementOnce.ts';
import type {TelnyxSmsTransport} from '../src/lib/execution-dispatch/telnyxSmsResult.ts';
import {FEH_ACKNOWLEDGEMENT_V2_COPY} from '../src/lib/execution-dispatch/telnyxAcknowledgementAdapter.ts';

// Private test entry point. Callers supply two scoped database clients. The
// driver has no environment, provider credentials, configurable transport or
// HTTP route. Use only with an independently verified synthetic fixture.
const fixturePhone = '+447700900001';
const projectRef = 'vredwhyphrhsudggrsen';

export async function runPrivateAcknowledgementTrial(
  authority: AcknowledgementWorkerDatabase,
  worker: AcknowledgementWorkerDatabase,
  expectedLeadId: number,
  scenario: 'accepted' | 'timeout',
  window: Readonly<{start:string; end:string}>,
) {
  if (!Number.isSafeInteger(expectedLeadId) || expectedLeadId <= 0 ||
      (scenario !== 'accepted' && scenario !== 'timeout') || authority === worker) {
    throw new Error('Invalid private trial configuration');
  }

  const {start, end} = window;
  const open = () => isBoundedTestWindowOpen(start,end,Date.now());
  const held = {data: null, error: {code: 'TRIAL_SCOPE_MISMATCH'}};
  if (!open()) return {mode: 'mock' as const, status: 'blocked' as const, attemptId: null, mockInvocations: 0};

  // Still run normal candidate discovery. A different eligible lead must never
  // acquire authority from a trial intended for this fixture.
  const scopedAuthority: AcknowledgementWorkerDatabase = {
    async rpc(name, args) {
      if (!open() || args.p_allowed_phone !== fixturePhone ||
          !(name === 'select_enquiry' ||
            (name === 'authorize_enquiry' && args.p_lead_id === expectedLeadId))) {
        return held;
      }
      return authority.rpc(name, args);
    },
  };
  // Let the reviewed finalizer record an outcome if the interval ends after
  // preparation. Reject earlier operations as soon as that interval closes.
  const scopedWorker: AcknowledgementWorkerDatabase = {
    async rpc(name, args) {
      if (!open() && !['complete_execution_dispatch_success','complete_execution_dispatch_failure',
        'complete_execution_dispatch_indeterminate'].includes(name)) return held;
      return worker.rpc(name,args);
    },
  };
  let mockInvocations = 0;
  const recorder: TelnyxSmsTransport = {
    async createMessage(request) {
      mockInvocations++;
      if (!open() || mockInvocations !== 1 || request.to !== fixturePhone ||
          request.text !== FEH_ACKNOWLEDGEMENT_V2_COPY || scenario === 'timeout') {
        return {outcome: 'transport_error'};
      }
      // Shape required by the reviewed finalizer. This UUID identifies a mock
      // submission in the isolated fixture database, never a provider receipt.
      return {outcome: 'response', httpStatus: 200, body: {data: {
        id: randomUUID(), record_type: 'message', direction: 'outbound', type: 'SMS',
        from: {phone_number: request.from}, to: [{phone_number: fixturePhone, status: 'queued'}], errors: [],
      }}};
    },
  };
  const result = await runNextAutomaticAcknowledgementOnce(scopedAuthority, scopedWorker,
    {enabled: true, projectRef, allowedPhone: fixturePhone}, recorder);
  return {mode: 'mock' as const, status: result.status, attemptId: result.attemptId, mockInvocations};
}
