// Public surface of the FEH Enterprise Intelligence Engine. Gate 5 is
// additive-only and not called from any page or route yet — this barrel
// exists so a future, explicitly-approved integration has one stable
// import path rather than reaching into internal files directly.

export { runEnterpriseIntelligence } from "./engine.ts";
export {
  getFeatureFlagState,
  isEnterpriseIntelligenceEngineEnabled,
  isEnterpriseIntelligenceShadowModeEnabled,
} from "./featureFlags.ts";
export { ENGINE_VERSION } from "./audit.ts";
export type {
  CapabilityId,
  CapabilityOutcome,
  CapabilityStatus,
  ConfidenceLevel,
  ConfidenceResult,
  DecisionOutcome,
  EnterpriseIntelligenceRequest,
  EnterpriseIntelligenceResponse,
  EvidenceItem,
  FeatureFlagState,
  ProvenanceRecord,
  SafeFailure,
} from "./types";
