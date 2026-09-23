import type { IntentRadarSnapshot } from "./intentRadar.ts";

export type ApolloEnrichmentReviewPlan = Readonly<{
  status: "READY_FOR_HUMAN_ENRICHMENT_REVIEW" | "BLOCKED";
  companyName: string;
  companyNumber: string | null;
  companyDomain: string | null;
  strongVerifiedSignals: number;
  provider: "APOLLO";
  enrichmentScope: "COMPANY_AND_DECISION_MAKER";
  enrichmentExecutionAllowed: false;
  creditsSpendAllowed: false;
  crmWriteAllowed: false;
  sequenceEnrollmentAllowed: false;
  emailSendAllowed: false;
  whatsappSendAllowed: false;
  reasons: readonly string[];
}>;

export function planApolloEnrichmentFromIntentRadar(
  snapshot: IntentRadarSnapshot,
): ApolloEnrichmentReviewPlan {
  const reasons: string[] = [];
  const durableIdentity = Boolean(snapshot.companyNumber || snapshot.companyDomain);
  const verifiedTrigger = snapshot.strongVerifiedSignals > 0 && snapshot.apolloEnrichmentAllowed;

  if (!durableIdentity) reasons.push("Durable company number or domain is required before Apollo enrichment review.");
  if (!verifiedTrigger) reasons.push("At least one independent strong verified company signal is required before Apollo enrichment review.");
  if (snapshot.crmWriteAllowed || snapshot.outreachAllowed || snapshot.promotionAllowed) {
    reasons.push("Intent Radar snapshot violates the fail-closed capability boundary.");
  }

  const ready = durableIdentity && verifiedTrigger && reasons.length === 0;
  if (ready) {
    reasons.push(
      "Company is eligible for a human decision on Apollo enrichment only.",
      "Apollo credits, CRM persistence, sequence enrollment and outreach remain separately prohibited.",
    );
  }

  return {
    status: ready ? "READY_FOR_HUMAN_ENRICHMENT_REVIEW" : "BLOCKED",
    companyName: snapshot.companyName,
    companyNumber: snapshot.companyNumber,
    companyDomain: snapshot.companyDomain,
    strongVerifiedSignals: snapshot.strongVerifiedSignals,
    provider: "APOLLO",
    enrichmentScope: "COMPANY_AND_DECISION_MAKER",
    enrichmentExecutionAllowed: false,
    creditsSpendAllowed: false,
    crmWriteAllowed: false,
    sequenceEnrollmentAllowed: false,
    emailSendAllowed: false,
    whatsappSendAllowed: false,
    reasons,
  };
}
