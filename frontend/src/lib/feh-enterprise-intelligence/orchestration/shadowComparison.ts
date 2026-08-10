import { scoreRenewal } from "../../intelligence/scoring/renewal.ts";
import type { LeadRecord as V2LeadRecord } from "../../intelligence/types";

import type { NormalizedLeadContext } from "../context/contextTypes";
import type { CapabilityOutcome } from "../types";

/**
 * Developer-only shadow comparison: confirms the engine's renewal
 * capability (which wraps the validated V2 renewal module through
 * adapters/renewalAdapter.ts) still agrees with calling V2 directly on the
 * same input. This guards against the adapter layer silently distorting a
 * value — it is not a V1-vs-V2 comparison, since that already exists,
 * tested and working, in lib/intelligence/renewalShadowDeployment.ts and
 * is not duplicated here.
 *
 * Never changes what the caller receives. Only logs a mismatch, server-side,
 * for a developer to investigate — never exposed to a user.
 */
export function shadowCompareRenewal(
  lead: NormalizedLeadContext,
  engineOutcome: CapabilityOutcome | undefined,
  today: Date,
): void {
  if (!engineOutcome) {
    return;
  }

  // id/created_at/notes are unused by scoreRenewal — see the identical note
  // in adapters/renewalAdapter.ts.
  const v2Lead: V2LeadRecord = {
    id: lead.id ?? 0,
    created_at: "",
    company_name: lead.company_name,
    contact_name: lead.contact_name,
    telephone: lead.telephone,
    email: lead.email,
    supplier: lead.supplier,
    contract_end: lead.contract_end,
    status: lead.status,
    notes: null,
    lead_source: null,
    source_detail: null,
    source_provenance: "user-entered",
  };

  const direct = scoreRenewal(v2Lead, today);
  const engineUrgency = engineOutcome.metadata?.urgency;

  if (engineUrgency !== undefined && engineUrgency !== direct.urgency) {
    console.warn(
      `[Enterprise Intelligence Engine] Shadow comparison mismatch for lead ${lead.id ?? "unknown"}: ` +
        `engine urgency="${engineUrgency}" direct V2 urgency="${direct.urgency}".`,
    );
  }
}
