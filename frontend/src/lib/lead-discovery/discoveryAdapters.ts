import type { DiscoveryRequest, PlannedDiscoveryQuery, PublicWebEvidence } from "./factory044Discovery.ts";
import { buildDiscoveryQueries } from "./factory044Discovery.ts";

export type DiscoveryProvider = "PUBLIC_WEB" | "APOLLO";
export type DiscoveryAdapterStatus = "READY" | "UNAVAILABLE";

export type DiscoveryAdapterPlan = Readonly<{
  provider: DiscoveryProvider;
  status: DiscoveryAdapterStatus;
  reason: string;
  queries: readonly PlannedDiscoveryQuery[];
  executionPerformed: false;
  creditsConsumed: 0;
}>;

export interface DiscoveryAdapter {
  readonly provider: DiscoveryProvider;
  plan(request: DiscoveryRequest): DiscoveryAdapterPlan;
}

export const publicWebDiscoveryAdapter: DiscoveryAdapter = {
  provider: "PUBLIC_WEB",
  plan(request) {
    return {
      provider: "PUBLIC_WEB",
      status: "READY",
      reason: "Queries are prepared for controlled public-web discovery; this adapter does not execute network requests.",
      queries: buildDiscoveryQueries(request),
      executionPerformed: false,
      creditsConsumed: 0,
    };
  },
};

export const apolloDiscoveryAdapter: DiscoveryAdapter = {
  provider: "APOLLO",
  plan() {
    return {
      provider: "APOLLO",
      status: "UNAVAILABLE",
      reason: "Apollo company-search execution remains dormant until FEH has authorised API-plan access and a separate credit-spend gate.",
      queries: [],
      executionPerformed: false,
      creditsConsumed: 0,
    };
  },
};

export type LeadPromotionCandidate = Readonly<{
  companyName: string;
  domain: string | null;
  evidence: readonly PublicWebEvidence[];
  promotionStatus: "REVIEW_REQUIRED";
  crmWritePerformed: false;
  outreachPermissionGranted: false;
}>;

export function prepareLeadPromotionCandidate(evidence: readonly PublicWebEvidence[]): LeadPromotionCandidate | null {
  if (evidence.length === 0) return null;
  const companyName = evidence[0]?.candidateName?.trim();
  if (!companyName) return null;
  return {
    companyName,
    domain: evidence[0]?.candidateDomain?.trim() || null,
    evidence: [...evidence],
    promotionStatus: "REVIEW_REQUIRED",
    crmWritePerformed: false,
    outreachPermissionGranted: false,
  };
}
