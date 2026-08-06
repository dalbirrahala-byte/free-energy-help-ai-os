import { buildAuditMetadata } from "../audit.ts";
import { calculateConfidence } from "../confidence.ts";
import { buildCustomerContext } from "../context/customerContext.ts";
import { buildLeadContext } from "../context/leadContext.ts";
import { aggregateDecision } from "../decisions/decisionEngine.ts";
import { isolateCapabilityError, safeFailure } from "../errors.ts";
import { getFeatureFlagState } from "../featureFlags.ts";
import type {
  CapabilityId,
  CapabilityOutcome,
  EnterpriseIntelligenceRequest,
  EnterpriseIntelligenceResponse,
  SafeFailure,
} from "../types";
import { getCapability } from "./capabilityRegistry.ts";
import { shadowCompareRenewal } from "./shadowComparison.ts";

function validateRequest(request: EnterpriseIntelligenceRequest): SafeFailure | null {
  if (!request.capabilities || request.capabilities.length === 0) {
    return safeFailure("request", "NO_CAPABILITIES_REQUESTED", "At least one capability must be requested.");
  }
  if (!request.context || !request.context.lead) {
    return safeFailure("request", "MISSING_LEAD_CONTEXT", "Lead context is required.");
  }
  return null;
}

/**
 * The central Enterprise Intelligence engine (Gate 5, V1).
 *
 * Accepts a typed request, validates it, loads only the context genuinely
 * supplied by the caller (no Supabase query happens anywhere in this
 * module), invokes each requested, registered capability with full error
 * isolation, aggregates a deterministic decision, and returns a fully
 * audited response. A single capability throwing never crashes the engine
 * — it becomes one typed safe failure alongside whatever other
 * capabilities did succeed.
 *
 * This function is not called by any page or route yet (Gate 5 is
 * additive-only). USE_ENTERPRISE_INTELLIGENCE_ENGINE and
 * ENTERPRISE_INTELLIGENCE_SHADOW_MODE exist for a future integration point
 * to check before relying on this engine's output.
 */
export function runEnterpriseIntelligence(request: EnterpriseIntelligenceRequest): EnterpriseIntelligenceResponse {
  const today = request.today ?? new Date();
  const featureFlagState = getFeatureFlagState();
  const errors: SafeFailure[] = [];

  const validationError = validateRequest(request);
  if (validationError) {
    const audit = buildAuditMetadata(request.requestId, request.capabilities ?? [], [], featureFlagState, today);
    return {
      requestId: audit.requestId,
      audit,
      capabilityResults: {},
      decision: {
        evidence: [],
        reasoning: [],
        recommendation: "Recommendation unavailable — insufficient data",
        confidence: calculateConfidence([]),
        missingData: [],
        provenance: [],
        explanation: validationError.message,
      },
      errors: [validationError],
    };
  }

  const leadContext = buildLeadContext(request.context.lead);
  const customerContext = buildCustomerContext(request.context.customer);
  const activities = request.context.activities ?? [];
  const tasks = request.context.tasks ?? [];

  const capabilityResults: Partial<Record<CapabilityId, CapabilityOutcome>> = {};

  for (const capabilityId of request.capabilities) {
    const capability = getCapability(capabilityId);

    if (!capability) {
      errors.push(safeFailure(capabilityId, "UNKNOWN_CAPABILITY", `Capability "${capabilityId}" is not registered.`));
      continue;
    }

    try {
      capabilityResults[capabilityId] = capability.execute({
        lead: leadContext,
        customer: customerContext,
        activities,
        tasks,
        today,
      });
    } catch (error) {
      errors.push(isolateCapabilityError(capabilityId, error));
    }
  }

  if (featureFlagState.shadowMode && capabilityResults.renewalIntelligence) {
    shadowCompareRenewal(leadContext, capabilityResults.renewalIntelligence, today);
  }

  const decision = aggregateDecision(capabilityResults);

  const sourceFields = [...leadContext.fieldsSupplied, ...(customerContext.supplied ? ["customer"] : [])];
  const audit = buildAuditMetadata(request.requestId, request.capabilities, sourceFields, featureFlagState, today);

  return {
    requestId: audit.requestId,
    audit,
    capabilityResults,
    decision,
    errors,
  };
}
