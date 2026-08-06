import { readBooleanFlag } from "../shared/featureFlags.ts";
import type { OrchestratorFeatureFlagState } from "./types";

const ORCHESTRATOR_FLAG = "USE_AI_WORKFORCE_ORCHESTRATOR";
const SHADOW_FLAG = "AI_WORKFORCE_SHADOW_MODE";

/**
 * Default false — same rollback-safe pattern as
 * USE_ENTERPRISE_INTELLIGENCE_ENGINE and USE_COMMERCIAL_INTELLIGENCE_V2.
 * The orchestrator function itself is always callable (tests, future
 * integrations); this flag is for a future caller to check before treating
 * its output as authoritative.
 */
export function isAiWorkforceOrchestratorEnabled(): boolean {
  return readBooleanFlag(ORCHESTRATOR_FLAG, false);
}

/** Default true — shadow/compare-only until explicitly turned off. */
export function isAiWorkforceShadowModeEnabled(): boolean {
  return readBooleanFlag(SHADOW_FLAG, true);
}

export function getOrchestratorFeatureFlagState(): OrchestratorFeatureFlagState {
  return {
    orchestratorEnabled: isAiWorkforceOrchestratorEnabled(),
    shadowMode: isAiWorkforceShadowModeEnabled(),
  };
}
