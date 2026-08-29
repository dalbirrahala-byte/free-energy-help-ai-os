// Factory 041: provider-neutral contract for real dispatch adapters.
//
// This is an additive successor to the Phase 10 no-op-only
// `ProviderAdapter` contract. Real adapters require a prepared dispatch
// context and return the Phase 15 outcome vocabulary; they must not be
// forced through the earlier no-op shape. This module provides only a
// type contract and a fail-closed identity check. It contains no registry,
// runtime wiring, provider transport, database access, credential access,
// retry behaviour, or authority grant.

import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ProviderDispatchResult } from "./checkpointThreeDispatchBoundary.ts";

const MAX_ADAPTER_IDENTITY_LENGTH = 200;
const CONTACT_CHANNELS: ReadonlySet<ContactChannel> = new Set(["PHONE", "EMAIL", "WHATSAPP", "SMS"]);

export type ProviderDispatchAdapterIdentity = {
  readonly provider: string;
  readonly channel: ContactChannel;
  readonly adapterKey: string;
};

/**
 * Provider-neutral shape implemented by a real dispatch adapter.
 * `TContext` remains adapter-specific because PHONE, EMAIL, SMS, and
 * WhatsApp transports need different validated inputs. Authority and
 * approval are intentionally not represented here: a matching identity
 * is necessary for dispatch selection, but never proves that a database
 * adapter row is approved or that execution is authorised.
 */
export interface ProviderDispatchAdapter<TContext> extends ProviderDispatchAdapterIdentity {
  dispatch(context: TContext): Promise<ProviderDispatchResult>;
}

function isUsableIdentityPart(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_ADAPTER_IDENTITY_LENGTH;
}

function isContactChannel(value: unknown): value is ContactChannel {
  return typeof value === "string" && CONTACT_CHANNELS.has(value as ContactChannel);
}

/**
 * Fail-closed runtime identity check for a future orchestration layer.
 * This checks implementation identity only. It does not approve an
 * adapter, validate a prepared envelope, or grant execution authority.
 */
export function matchesProviderDispatchAdapterIdentity(
  adapter: unknown,
  expected: ProviderDispatchAdapterIdentity,
): adapter is ProviderDispatchAdapter<unknown> {
  if (typeof adapter !== "object" || adapter === null) return false;

  const candidate = adapter as Partial<ProviderDispatchAdapter<unknown>>;
  if (
    !isUsableIdentityPart(expected.provider) ||
    !isUsableIdentityPart(expected.adapterKey) ||
    !isUsableIdentityPart(candidate.provider) ||
    !isUsableIdentityPart(candidate.adapterKey) ||
    !isContactChannel(expected.channel) ||
    !isContactChannel(candidate.channel)
  ) {
    return false;
  }

  return (
    candidate.provider === expected.provider &&
    candidate.channel === expected.channel &&
    candidate.adapterKey === expected.adapterKey &&
    typeof candidate.dispatch === "function"
  );
}
