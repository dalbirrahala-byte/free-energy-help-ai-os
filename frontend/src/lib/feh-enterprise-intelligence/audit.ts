import type { AuditMetadata, CapabilityId, FeatureFlagState } from "./types";

export const ENGINE_VERSION = "feh-enterprise-intelligence@0.1.0-gate5";

function generateRequestId(): string {
  // Node's global Web Crypto API — available since Node 19, no package required.
  return `EIE-${crypto.randomUUID()}`;
}

export function buildAuditMetadata(
  requestId: string | undefined,
  capabilitiesRequested: CapabilityId[],
  sourceFields: string[],
  featureFlagState: FeatureFlagState,
  calculatedAt: Date,
): AuditMetadata {
  return {
    requestId: requestId ?? generateRequestId(),
    capabilitiesRequested,
    sourceFields,
    featureFlagState,
    calculatedAt: calculatedAt.toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}
