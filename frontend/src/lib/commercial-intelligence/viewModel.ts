// Gate 7 Production Integration. The single typed integration point between
// the lead-detail page and the two dormant, already-tested engines (the FEH
// Enterprise Intelligence Engine and the AI Workforce Orchestrator). This
// file computes nothing itself — it calls the existing engines, compares
// their output against the page's already-proven-safe values, and decides
// whether the result is safe to display. No new scoring or classification
// logic is introduced anywhere in this file.
//
// Visibility rules:
// - USE_ENTERPRISE_INTELLIGENCE_ENGINE=false (default): engine is never
//   called, `visible` is always false, the lead page is unaffected.
// - Engine enabled + shadow mode on (default once enabled): the engine runs
//   and its renewal urgency is compared against the page's existing,
//   already-displayed V2 renewal result; any mismatch is logged server-side
//   only. `visible` stays false — shadow mode never changes what a user
//   sees, by definition.
// - Engine enabled + shadow mode off: `visible` is true and the panel
//   renders the engine's own evidence-based output.
// - Engine throwing, or returning zero capability results, is treated as
//   unavailable: falls back to `visible: false` with a logged warning,
//   never a crash and never a fabricated value.
//
// AI Workforce is deliberately not invoked here. Its two real workers are
// thin wrappers over this same FEH Engine (see ADR-003), so calling both
// would recompute identical output twice for no benefit. Only its feature-
// flag readiness state is surfaced, which is what Version 1.0 scope
// actually requires on this page.

import { isAiWorkforceOrchestratorEnabled, isAiWorkforceShadowModeEnabled } from "../ai-workforce/featureFlags.ts";
import { runEnterpriseIntelligence } from "../feh-enterprise-intelligence/engine.ts";
import {
  isEnterpriseIntelligenceEngineEnabled,
  isEnterpriseIntelligenceShadowModeEnabled,
} from "../feh-enterprise-intelligence/featureFlags.ts";
import type { CapabilityId, EnterpriseIntelligenceResponse } from "../feh-enterprise-intelligence/types";
import type { CanonicalActivity, CanonicalLead, CanonicalTask } from "../shared/domain";

const REQUESTED_CAPABILITIES: CapabilityId[] = [
  "renewalIntelligence",
  "leadIntelligence",
  "customerHealth",
  "workflowRecommendation",
  "opportunityIntelligence",
  "complianceEvaluation",
];

export type CommercialIntelligenceViewModel = {
  engineEnabled: boolean;
  shadowMode: boolean;
  aiWorkforceEnabled: boolean;
  aiWorkforceShadowMode: boolean;
  response: EnterpriseIntelligenceResponse | null;
  visible: boolean;
  unavailableReason: string | null;
};

type ViewModelLead = Pick<
  CanonicalLead,
  "id" | "company_name" | "contact_name" | "telephone" | "email" | "supplier" | "contract_end" | "status"
>;
type ViewModelActivity = Pick<CanonicalActivity, "activity_date">;
type ViewModelTask = Pick<CanonicalTask, "due_date" | "status">;

function flagsOnlyResult(
  engineEnabled: boolean,
  shadowMode: boolean,
  aiWorkforceEnabled: boolean,
  aiWorkforceShadowMode: boolean,
  unavailableReason: string,
): CommercialIntelligenceViewModel {
  return {
    engineEnabled,
    shadowMode,
    aiWorkforceEnabled,
    aiWorkforceShadowMode,
    response: null,
    visible: false,
    unavailableReason,
  };
}

/**
 * Builds the Commercial Intelligence ViewModel for a single lead. Never
 * throws — any failure inside the engine is caught here and reported as an
 * honest "unavailable" state, with the existing, already-displayed cards
 * left as the source of truth.
 */
export function buildCommercialIntelligenceViewModel(
  lead: ViewModelLead,
  activities: ViewModelActivity[],
  tasks: ViewModelTask[],
  existingRenewalUrgency: string | null,
  today: Date = new Date(),
): CommercialIntelligenceViewModel {
  const engineEnabled = isEnterpriseIntelligenceEngineEnabled();
  const shadowMode = isEnterpriseIntelligenceShadowModeEnabled();
  const aiWorkforceEnabled = isAiWorkforceOrchestratorEnabled();
  const aiWorkforceShadowMode = isAiWorkforceShadowModeEnabled();

  if (!engineEnabled) {
    return flagsOnlyResult(
      engineEnabled,
      shadowMode,
      aiWorkforceEnabled,
      aiWorkforceShadowMode,
      "Enterprise Intelligence Engine is disabled (USE_ENTERPRISE_INTELLIGENCE_ENGINE=false).",
    );
  }

  let response: EnterpriseIntelligenceResponse;

  try {
    response = runEnterpriseIntelligence({
      capabilities: REQUESTED_CAPABILITIES,
      context: {
        lead: {
          id: lead.id,
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          telephone: lead.telephone,
          email: lead.email,
          supplier: lead.supplier,
          contract_end: lead.contract_end,
          status: lead.status,
        },
        activities,
        tasks,
      },
      today,
    });
  } catch (error) {
    console.warn(
      `[Commercial Intelligence ViewModel] Enterprise Intelligence Engine threw for lead ${lead.id} — falling back to existing cards. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return flagsOnlyResult(
      engineEnabled,
      shadowMode,
      aiWorkforceEnabled,
      aiWorkforceShadowMode,
      "Enterprise Intelligence Engine failed — existing cards shown instead.",
    );
  }

  if (Object.keys(response.capabilityResults).length === 0) {
    console.warn(
      `[Commercial Intelligence ViewModel] Enterprise Intelligence Engine returned zero capability results for lead ${lead.id} — falling back to existing cards.`,
    );
    return flagsOnlyResult(
      engineEnabled,
      shadowMode,
      aiWorkforceEnabled,
      aiWorkforceShadowMode,
      "Enterprise Intelligence Engine returned no results — existing cards shown instead.",
    );
  }

  const renewalOutcome = response.capabilityResults.renewalIntelligence;
  const engineUrgency = renewalOutcome?.metadata?.urgency;

  if (existingRenewalUrgency !== null && typeof engineUrgency === "string" && engineUrgency !== existingRenewalUrgency) {
    console.warn(
      `[Commercial Intelligence ViewModel] Shadow mismatch for lead ${lead.id}: existing renewal urgency="${existingRenewalUrgency}" engine urgency="${engineUrgency}".`,
    );
  }

  if (shadowMode) {
    return {
      engineEnabled,
      shadowMode,
      aiWorkforceEnabled,
      aiWorkforceShadowMode,
      response,
      visible: false,
      unavailableReason: "Enterprise Intelligence Engine is in shadow mode — computed and compared, not yet displayed.",
    };
  }

  return {
    engineEnabled,
    shadowMode,
    aiWorkforceEnabled,
    aiWorkforceShadowMode,
    response,
    visible: true,
    unavailableReason: null,
  };
}
