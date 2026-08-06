import type { CanonicalActivity, CanonicalCustomer, CanonicalLead, CanonicalTask } from "../shared/domain";

// Core evidence / confidence primitives — every capability and the
// top-level decision output are built from these same shapes.

export type ConfidenceLevel = "High" | "Medium" | "Low" | "Insufficient";

export type ConfidenceResult = {
  level: ConfidenceLevel;
  explanation: string;
  evidenceAvailable: number;
  evidenceTotal: number;
};

export type EvidenceItem = {
  field: string;
  label: string;
  available: boolean;
  value: string | number | null;
  source: string;
};

export type ProvenanceRecord = {
  field: string;
  source: string;
};

export type CapabilityStatus =
  | "ok"
  | "insufficient_data"
  | "not_configured"
  | "pending_approval"
  | "unavailable"
  | "error";

export type CapabilityId =
  | "renewalIntelligence"
  | "leadIntelligence"
  | "customerHealth"
  | "opportunityIntelligence"
  | "workflowRecommendation"
  | "complianceEvaluation";

// Every capability result follows: Evidence -> Reasoning -> Recommendation
// -> Confidence -> Missing Data -> Provenance, plus a status and an overall
// explanation. `metadata` carries small, typed, capability-specific extras
// (e.g. the raw renewal urgency tier) that the decision layer needs without
// forcing every capability into one rigid shape.
export type CapabilityOutcome = {
  capabilityId: CapabilityId;
  status: CapabilityStatus;
  evidence: EvidenceItem[];
  reasoning: string[];
  recommendation: string;
  confidence: ConfidenceResult;
  missingData: string[];
  provenance: ProvenanceRecord[];
  explanation: string;
  metadata?: Record<string, string | number | boolean | null>;
};

// Context — only ever populated from data the caller supplies. Nothing in
// this module queries Supabase or any other data source.

export type LeadContextInput = Pick<
  CanonicalLead,
  "company_name" | "contact_name" | "telephone" | "email" | "supplier" | "contract_end" | "status"
> &
  Partial<Pick<CanonicalLead, "id" | "notes">>;

export type CustomerContextInput = Pick<
  CanonicalCustomer,
  "company_name" | "contact_name" | "telephone" | "email" | "status"
> &
  Partial<Pick<CanonicalCustomer, "id">>;

export type ActivityContextInput = Pick<CanonicalActivity, "activity_date"> &
  Partial<Pick<CanonicalActivity, "activity_type">>;

export type TaskContextInput = Pick<CanonicalTask, "due_date" | "status">;

// No conversation/voice data source exists anywhere in this project yet —
// this type exists so the contract is ready, not because anything produces
// real conversation data today.
export type ConversationContextInput = {
  transcriptAvailable: boolean;
};

// Request / response contracts

export type EnterpriseIntelligenceRequest = {
  requestId?: string;
  capabilities: CapabilityId[];
  context: {
    lead: LeadContextInput;
    customer?: CustomerContextInput | null;
    activities?: ActivityContextInput[];
    tasks?: TaskContextInput[];
    conversation?: ConversationContextInput | null;
  };
  today?: Date;
};

export type FeatureFlagState = {
  engineEnabled: boolean;
  shadowMode: boolean;
};

export type DecisionOutcome = {
  evidence: EvidenceItem[];
  reasoning: string[];
  recommendation: string;
  confidence: ConfidenceResult;
  missingData: string[];
  provenance: ProvenanceRecord[];
  explanation: string;
};

export type SafeFailure = {
  capabilityId: CapabilityId | "request" | "engine";
  code: string;
  message: string;
};

export type AuditMetadata = {
  requestId: string;
  capabilitiesRequested: CapabilityId[];
  sourceFields: string[];
  featureFlagState: FeatureFlagState;
  calculatedAt: string;
  engineVersion: string;
};

export type EnterpriseIntelligenceResponse = {
  requestId: string;
  audit: AuditMetadata;
  capabilityResults: Partial<Record<CapabilityId, CapabilityOutcome>>;
  decision: DecisionOutcome;
  errors: SafeFailure[];
};
