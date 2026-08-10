// Value import uses a relative path with an explicit .ts extension (rather
// than the usual @/ alias, extensionless style) so this module's dependency
// graph is directly resolvable by Node's native test runner (node --test)
// with no bundler involved — same pattern established in
// lib/intelligence/renewalShadowDeployment.ts. Type-only imports are
// unaffected; they're erased before Node ever tries to resolve them.
import { scoreRenewal } from "../../intelligence/scoring/renewal.ts";
import type { LeadRecord as V2LeadRecord, RenewalUrgency } from "../../intelligence/types";

import type { NormalizedLeadContext } from "../context/contextTypes";
import type { EvidenceItem, ProvenanceRecord } from "../types";
import type { AdapterResult } from "./adapterTypes";

export type RenewalAdapterResult = AdapterResult & {
  urgency: RenewalUrgency;
  daysRemaining: number | null;
};

/**
 * Thin translation layer over the validated V2 renewal engine
 * (lib/intelligence/scoring/renewal.ts). Performs no calculation of its
 * own — every number and classification here comes directly from that
 * already-tested, shadow-deployed module.
 */
export function adaptRenewalIntelligence(context: NormalizedLeadContext, today: Date): RenewalAdapterResult {
  // id/created_at/notes are unused by scoreRenewal — filled with inert
  // placeholders purely to satisfy its (intentionally shared, broader)
  // parameter type; only contract_end actually drives the calculation.
  const leadRecord: V2LeadRecord = {
    id: context.id ?? 0,
    created_at: "",
    company_name: context.company_name,
    contact_name: context.contact_name,
    telephone: context.telephone,
    email: context.email,
    supplier: context.supplier,
    contract_end: context.contract_end,
    status: context.status,
    notes: null,
    lead_source: null,
    source_detail: null,
    source_provenance: "user-entered",
  };

  const result = scoreRenewal(leadRecord, today);

  const evidence: EvidenceItem[] = [
    {
      field: "contract_end",
      label: "Contract end date",
      available: result.contractEndDate !== null,
      value: result.contractEndDate,
      source: "lead.contract_end",
    },
    {
      field: "days_remaining",
      label: "Days remaining",
      available: result.daysRemaining !== null,
      value: result.daysRemaining,
      source: "lib/intelligence/scoring/renewal.ts (validated V2)",
    },
  ];

  const missingData = result.contractEndDate === null ? ["Contract end date"] : [];

  const provenance: ProvenanceRecord[] = [
    { field: "contract_end", source: "lead.contract_end" },
    { field: "urgency", source: "lib/intelligence/scoring/renewal.ts (validated V2)" },
  ];

  return {
    evidence,
    reasoning: [result.explanation, `Procurement status: ${result.procurementStatus}.`],
    recommendation: result.recommendedNextAction,
    missingData,
    provenance,
    urgency: result.urgency,
    daysRemaining: result.daysRemaining,
  };
}
