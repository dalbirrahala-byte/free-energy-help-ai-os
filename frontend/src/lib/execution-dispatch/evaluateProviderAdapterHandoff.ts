// Factory 041 Phase 10: provider adapter handoff harness, strictly
// non-executing.
//
// Answers exactly one question: "can this sealed Phase 9 provider-neutral
// dispatch contract be safely handed to a non-executing provider adapter
// boundary?" It does NOT answer "should this prospect be contacted"
// (decided upstream, by Phases 2-9) and it does NOT itself contact
// anybody -- it never places a call, sends an email/WhatsApp/SMS, invokes
// AI Voice or any telephony/email/messaging provider, and never performs
// database, network, or environment/secret access of any kind.
//
// PHASE 9 REMAINS AUTHORITATIVE, SEALED-INPUT ONLY: this module accepts
// ONLY an already-sealed `ProviderNeutralDispatchContract` (or `null`) --
// it never reconstructs one from raw Phase 6/7/8 objects, raw CRM/contact
// data, or commercial signals, and it has no code path capable of doing
// so (there is no Supabase import, no identity/suppression/compliance
// logic, and no field on its own input type that could carry raw contact
// or opportunity data). A caller who passes a Phase 8 decision, a raw
// Phase 7 record, or a raw destination value in place of a contract is
// not specially detected -- it is simply rejected by the same structural
// validation every malformed contract fails, because none of those
// shapes carry the required camelCase contract fields this module checks.
//
// CHANNEL BINDING, NO FALLBACK: `adapter.channel` must exactly equal
// `contract.channel` or the handoff is rejected. No rewriting, no
// fallback, no automatic cross-channel routing -- PHONE stays PHONE,
// EMAIL stays EMAIL, WHATSAPP stays WHATSAPP, SMS stays SMS.
//
// IDEMPOTENCY, PASSED THROUGH UNCHANGED: `contract.idempotencyKey` (the
// Phase 7 canonical key, already sealed into the Phase 9 contract) is
// validated structurally and surfaced in this module's own evidence
// unchanged -- never trimmed, rewritten, normalised, regenerated,
// replaced, or case-folded. This module implements no idempotency store
// of its own.
//
// FAIL CLOSED ON THE ADAPTER TOO: even though the only adapter Phase 10
// ships is the trusted no-op adapter, this harness never assumes any
// adapter (including a hypothetical future real one) behaves correctly --
// `adapter.execute()` is called inside a try/catch (an exception ->
// `evaluation_failed`), and its resolved value is independently
// structurally validated (a missing/invalid `status`, or
// `executionPerformed !== false`, -> `evaluation_failed`) before this
// module ever trusts it. No later or otherwise-positive signal can undo
// an earlier failure.
//
// COMMERCIAL SEPARATION, STRUCTURAL: `ProviderNeutralDispatchContract`
// (Phase 9) has no opportunity-score/estimated-value/commission/
// renewal-attractiveness/lead-priority field at all -- there is nothing
// of that kind for this module to read, let alone be swayed by.
//
// DATABASE / NETWORK / SECRET BEHAVIOUR: zero database access (no
// Supabase import, no migration), zero network calls (no HTTP client, no
// provider SDK import), and zero environment/secret access (no
// `process.env` read anywhere in this module).

import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ProviderAdapter, ProviderAdapterOutcomeStatus } from "./providerAdapter.ts";

const MAX_TOKEN_LENGTH = 200;

const VALID_CHANNELS: ReadonlySet<ContactChannel> = new Set(["PHONE", "EMAIL", "WHATSAPP", "SMS"]);
const VALID_OUTCOME_STATUSES: ReadonlySet<ProviderAdapterOutcomeStatus> = new Set(["accepted_noop", "rejected", "evaluation_failed"]);

export type ProviderAdapterHandoffStatus = "accepted_noop" | "rejected" | "evaluation_failed";

export type ProviderAdapterHandoffReason = { factor: string; detail: string };

/**
 * Minimum non-secret, audit-safe identifiers only -- deliberately
 * excludes any raw destination (telephone/email/WhatsApp/SMS), provider
 * credentials/tokens/secrets, and every commercial field. Mirrors Phase
 * 9's own data-minimisation discipline.
 */
export type ProviderAdapterHandoffEvidence = {
  authorizationRecordId: number | null;
  actionId: string | null;
  idempotencyKey: string | null;
  channel: ContactChannel | null;
  policyVersion: string | null;
  adapterKind: string | null;
};

export type ProviderAdapterHandoffResult = {
  status: ProviderAdapterHandoffStatus;
  evidence: ProviderAdapterHandoffEvidence;
  reasons: ProviderAdapterHandoffReason[];
  /** Always the literal `false`. `accepted_noop` means only "a non-executing adapter accepted this contract" -- never that anything was sent. */
  executionPerformed: false;
  evaluatedAt: string;
};

/** Same structural-usability rule as every prior phase in this chain: non-empty after trim, within a sane length bound. */
function isUsableToken(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TOKEN_LENGTH;
}

function isUsableTimestamp(value: string | null | undefined): boolean {
  if (value == null || value.trim().length === 0) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isPositiveInteger(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function buildEvidence(
  contract: ProviderNeutralDispatchContract | null,
  adapter: ProviderAdapter | null,
): ProviderAdapterHandoffEvidence {
  return {
    authorizationRecordId: contract?.authorizationRecordId ?? null,
    actionId: contract?.actionId ?? null,
    idempotencyKey: contract?.idempotencyKey ?? null,
    channel: contract?.channel ?? null,
    policyVersion: contract?.policyVersion ?? null,
    adapterKind: adapter?.kind ?? null,
  };
}

/**
 * The only I/O this module performs is awaiting `adapter.execute()` --
 * for the Phase 10 no-op adapter that resolves immediately with no
 * network/database/environment access whatsoever. Never mutates
 * `contract` or `adapter`. Every check below is independent and
 * fail-closed: the first failing condition determines the result, and no
 * later or otherwise-positive signal can undo an earlier failure.
 */
export async function evaluateProviderAdapterHandoff(
  contract: ProviderNeutralDispatchContract | null,
  adapter: ProviderAdapter | null,
  evaluatedAt: Date,
): Promise<ProviderAdapterHandoffResult> {
  const evaluatedAtIso = evaluatedAt.toISOString();
  const reasons: ProviderAdapterHandoffReason[] = [];

  function fail(status: "rejected" | "evaluation_failed", factor: string, detail: string): ProviderAdapterHandoffResult {
    reasons.push({ factor, detail });
    return {
      status,
      evidence: buildEvidence(contract, adapter),
      reasons,
      executionPerformed: false,
      evaluatedAt: evaluatedAtIso,
    };
  }

  if (!contract) {
    return fail("rejected", "Contract", "No Phase 9 provider-neutral dispatch contract was supplied.");
  }

  if (contract.executionPerformed !== false) {
    return fail("evaluation_failed", "Execution flag", "contract.executionPerformed was not literally false -- refusing to trust an internally inconsistent contract.");
  }

  if (!isPositiveInteger(contract.authorizationRecordId)) {
    return fail("rejected", "Authorization record", "contract.authorizationRecordId is missing or not a positive integer.");
  }
  if (!isUsableToken(contract.actionId)) {
    return fail("rejected", "Action identity", "contract.actionId is missing, blank, or exceeds the usable length bound.");
  }
  if (!isUsableToken(contract.idempotencyKey)) {
    return fail("rejected", "Idempotency", "contract.idempotencyKey is missing, blank, or exceeds the usable length bound.");
  }
  if (!isUsableToken(contract.policyVersion)) {
    return fail("rejected", "Policy version", "contract.policyVersion is missing, blank, or exceeds the usable length bound.");
  }
  if (!isUsableToken(contract.humanApprovalState)) {
    return fail("rejected", "Human approval", "contract.humanApprovalState is missing or blank.");
  }
  if (!isUsableToken(contract.outreachEligibilityStatus)) {
    return fail("rejected", "Outreach eligibility", "contract.outreachEligibilityStatus is missing or blank.");
  }
  if (!isUsableTimestamp(contract.contractCreatedAt)) {
    return fail("rejected", "Contract timestamp", "contract.contractCreatedAt is missing or not a parseable timestamp.");
  }
  if (!VALID_CHANNELS.has(contract.channel)) {
    return fail("rejected", "Channel", `contract.channel '${String(contract.channel)}' is not a recognised dispatch channel.`);
  }

  if (!adapter) {
    return fail("rejected", "Adapter", "No provider adapter was supplied/registered for this channel.");
  }
  if (typeof adapter.execute !== "function") {
    return fail("rejected", "Adapter", "Supplied adapter does not implement execute().");
  }
  if (!VALID_CHANNELS.has(adapter.channel)) {
    return fail("rejected", "Adapter channel", `adapter.channel '${String(adapter.channel)}' is not a recognised dispatch channel.`);
  }
  if (adapter.channel !== contract.channel) {
    return fail(
      "rejected",
      "Channel binding",
      `adapter.channel '${adapter.channel}' does not match contract.channel '${contract.channel}' -- no fallback or cross-channel routing is permitted.`,
    );
  }

  let outcome: Awaited<ReturnType<ProviderAdapter["execute"]>>;
  try {
    outcome = await adapter.execute(contract);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail("evaluation_failed", "Adapter exception", `Adapter threw during execute(): ${message}`);
  }

  if (
    outcome == null ||
    typeof outcome !== "object" ||
    typeof outcome.status !== "string" ||
    !VALID_OUTCOME_STATUSES.has(outcome.status as ProviderAdapterOutcomeStatus) ||
    outcome.executionPerformed !== false
  ) {
    return fail("evaluation_failed", "Adapter result", "Adapter returned a structurally invalid result -- failing closed rather than trusting it.");
  }

  reasons.push({
    factor: "Overall",
    detail: `Contract accepted by adapter '${adapter.kind}' for channel '${adapter.channel}' -- no execution performed.`,
  });

  return {
    status: outcome.status,
    evidence: buildEvidence(contract, adapter),
    reasons,
    executionPerformed: false,
    evaluatedAt: evaluatedAtIso,
  };
}
