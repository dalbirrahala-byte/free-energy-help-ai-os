// Factory 041 Phase 10: provider adapter interface + no-op harness,
// strictly non-executing.
//
// Defines the exact, provider-neutral interface every future execution
// adapter (FEH AI Voice for PHONE, a modular email adapter for EMAIL, an
// approved WhatsApp/SMS adapter) must implement, plus the ONLY concrete
// implementation this phase is authorised to ship: a local, deterministic
// no-op adapter used purely to prove the adapter boundary works without
// ever reaching a real provider. This module contains zero telephony/
// email/WhatsApp/SMS/AI-Voice/n8n code, zero provider SDK usage
// (no Twilio, Meta, Resend, SendGrid, SMTP client, or HTTP client of any
// kind), zero network calls, and zero environment/secret access.
//
// NO-OP ADAPTER, DELIBERATELY INERT: `createNoOpProviderAdapter()`
// returns an adapter whose `execute()` never reads a single field off the
// contract it is given (`void contract;` documents this explicitly), never
// awaits anything but its own immediate resolution, and always resolves
// to the literal `{ status: "accepted_noop", executionPerformed: false }`.
// It cannot resolve a destination, cannot generate a provider reference,
// and cannot perform I/O of any kind -- there is nothing in this function
// body that COULD reach an external system even if misused.
//
// CHANNEL BINDING: every adapter declares exactly one `channel`. Binding
// enforcement (does `adapter.channel` match the contract's channel?) is
// deliberately NOT this module's job -- it belongs to the harness
// (`evaluateProviderAdapterHandoff`), which is the boundary that actually
// receives both a contract and an adapter together and can fail closed on
// mismatch. This module only ever hands out an adapter already correctly
// bound to a single channel; it never itself performs cross-channel
// substitution or fallback.
//
// REGISTRY: `NO_OP_ADAPTER_REGISTRY` is a small, static, in-memory
// `Map<ContactChannel, ProviderAdapter>` built once at module load from a
// hardcoded list of the four known channels. It performs no dynamic
// provider loading, no reflection/plugin discovery, and no environment
// variable reads. `getNoOpAdapterForChannel()` returns `null` for any
// channel it does not recognise -- fail closed, never a guessed adapter.
//
// PROVIDER INDEPENDENCE: the interface itself is intentionally generic
// enough that a future, separately authorised phase could implement a
// real adapter against it -- but no such implementation exists here, and
// this module exports no way to register or load one dynamically.
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";

/**
 * Reserved for future use: any real-execution-success status is
 * deliberately NOT modelled in Phase 10. `accepted_noop` is the only
 * "positive" outcome this phase can ever produce; `rejected` covers
 * well-formed "no" answers (bad input, channel mismatch, no adapter);
 * `evaluation_failed` covers anomalies (adapter threw, adapter returned a
 * structurally invalid result). Introducing a real "executed" status is
 * explicitly deferred to a future, separately authorised phase that also
 * builds real persistence for execution_performed/execution_reference.
 */
export type ProviderAdapterOutcomeStatus = "accepted_noop" | "rejected" | "evaluation_failed";

export type ProviderAdapterOutcome = {
  readonly status: ProviderAdapterOutcomeStatus;
  /** Always the literal `false`. No Phase 10 adapter may ever report execution occurred. */
  readonly executionPerformed: false;
};

/**
 * The exact, provider-neutral contract every future execution adapter
 * must implement. `channel` declares which single `ContactChannel` this
 * adapter instance is bound to -- channel-binding enforcement itself
 * happens in the harness, not here. `execute()` accepts only a sealed
 * Phase 9 `ProviderNeutralDispatchContract` -- never raw Phase 6/7/8
 * objects, never raw contact/destination data.
 */
export interface ProviderAdapter {
  readonly channel: ContactChannel;
  /** A short, non-secret identifier for this adapter implementation, e.g. "no-op". Never a provider name/credential. */
  readonly kind: string;
  execute(contract: ProviderNeutralDispatchContract): Promise<ProviderAdapterOutcome>;
}

export const NO_OP_ADAPTER_KIND = "no-op";

/**
 * The only adapter implementation Phase 10 is authorised to ship. Its
 * `execute()` never reads the contract, never performs I/O, and always
 * resolves to `accepted_noop` -- proving the adapter boundary is
 * reachable and safe without granting any real execution capability.
 */
export function createNoOpProviderAdapter(channel: ContactChannel): ProviderAdapter {
  return Object.freeze({
    channel,
    kind: NO_OP_ADAPTER_KIND,
    async execute(contract: ProviderNeutralDispatchContract): Promise<ProviderAdapterOutcome> {
      void contract; // Deliberately never read -- see module header (no destination resolution, no provider call, no exceptions to this rule).
      return Object.freeze({ status: "accepted_noop", executionPerformed: false });
    },
  });
}

const ALL_CHANNELS: readonly ContactChannel[] = ["PHONE", "EMAIL", "WHATSAPP", "SMS"];

/** Static, local, deterministic -- built once at module load. No dynamic loading, no env reads, no reflection. */
export const NO_OP_ADAPTER_REGISTRY: ReadonlyMap<ContactChannel, ProviderAdapter> = new Map(
  ALL_CHANNELS.map((channel) => [channel, createNoOpProviderAdapter(channel)] as const),
);

/** Fails closed (`null`) for any channel not already present in the registry -- never a guessed/fallback adapter. */
export function getNoOpAdapterForChannel(channel: ContactChannel): ProviderAdapter | null {
  return NO_OP_ADAPTER_REGISTRY.get(channel) ?? null;
}
