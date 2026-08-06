import { readBooleanFlag } from "../shared/featureFlags.ts";
import type { FeatureFlagState } from "./types";

const ENGINE_FLAG = "USE_ENTERPRISE_INTELLIGENCE_ENGINE";
const SHADOW_FLAG = "ENTERPRISE_INTELLIGENCE_SHADOW_MODE";

/**
 * Default false. This engine is not used by any page or route yet — the
 * flag exists so a future integration point has a single, explicit switch
 * to check before calling it, rather than the engine's mere existence
 * implying it's safe to rely on.
 */
export function isEnterpriseIntelligenceEngineEnabled(): boolean {
  return readBooleanFlag(ENGINE_FLAG, false);
}

/**
 * Default true. When something does call this engine, it starts in
 * shadow/compare-only mode until explicitly turned off — mirroring the
 * same rollback-safe default pattern used by
 * USE_COMMERCIAL_INTELLIGENCE_V2.
 */
export function isEnterpriseIntelligenceShadowModeEnabled(): boolean {
  return readBooleanFlag(SHADOW_FLAG, true);
}

export function getFeatureFlagState(): FeatureFlagState {
  return {
    engineEnabled: isEnterpriseIntelligenceEngineEnabled(),
    shadowMode: isEnterpriseIntelligenceShadowModeEnabled(),
  };
}
