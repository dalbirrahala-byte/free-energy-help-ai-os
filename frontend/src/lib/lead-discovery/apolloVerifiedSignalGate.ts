import {
  buildIntentRadarSignal,
  buildIntentRadarSnapshot,
  type IntentRadarSnapshot,
} from "./intentRadar.ts";

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

function sameNullableText(left: string | null, right: string | null): boolean {
  return left === right;
}

export function planApolloEnrichmentFromIntentRadar(
  snapshot: IntentRadarSnapshot,
  asOf: string,
): ApolloEnrichmentReviewPlan {
  const reasons: string[] = [];
  let reconstructed: IntentRadarSnapshot | null = null;

  try {
    const canonicalSignals = snapshot.signals.map((signal) => buildIntentRadarSignal(signal));
    const signalIntegrityMatches = canonicalSignals.every((signal, index) => {
      const original = snapshot.signals[index];
      return Boolean(
        original &&
        signal.idempotencyKey === original.idempotencyKey &&
        signal.companyName === original.companyName &&
        signal.companyNumber === original.companyNumber &&
        signal.companyDomain === original.companyDomain &&
        signal.sourceReference === original.sourceReference &&
        signal.sourceUrl === original.sourceUrl &&
        signal.observedAt === original.observedAt &&
        signal.expiresAt === original.expiresAt &&
        signal.signalType === original.signalType &&
        signal.summary === original.summary
      );
    });
    if (!signalIntegrityMatches) {
      reasons.push("Intent Radar signal evidence is not in canonical validated form.");
    } else {
      reconstructed = buildIntentRadarSnapshot(canonicalSignals, asOf);
    }
  } catch {
    reasons.push("Intent Radar evidence could not be independently validated and reconstructed for this review instant.");
  }

  const evidenceMatchesSnapshot = Boolean(
    reconstructed &&
    reconstructed.companyName === snapshot.companyName &&
    sameNullableText(reconstructed.companyNumber, snapshot.companyNumber) &&
    sameNullableText(reconstructed.companyDomain, snapshot.companyDomain) &&
    reconstructed.totalSignals === snapshot.totalSignals &&
    reconstructed.verifiedFacts === snapshot.verifiedFacts &&
    reconstructed.inferences === snapshot.inferences &&
    reconstructed.strongVerifiedSignals === snapshot.strongVerifiedSignals &&
    reconstructed.apolloEnrichmentAllowed === snapshot.apolloEnrichmentAllowed,
  );

  if (!evidenceMatchesSnapshot) {
    reasons.push("Intent Radar derived fields do not match the underlying signal evidence.");
  }

  const durableIdentity = Boolean(reconstructed?.companyNumber || reconstructed?.companyDomain);
  const verifiedTrigger = Boolean(
    reconstructed &&
    reconstructed.strongVerifiedSignals > 0 &&
    reconstructed.apolloEnrichmentAllowed,
  );

  if (!durableIdentity) reasons.push("Durable company number or domain is required before Apollo enrichment review.");
  if (!verifiedTrigger) reasons.push("At least one independent strong verified company signal is required before Apollo enrichment review.");
  if (snapshot.crmWriteAllowed || snapshot.outreachAllowed || snapshot.promotionAllowed) {
    reasons.push("Intent Radar snapshot violates the fail-closed capability boundary.");
  }

  const ready = durableIdentity && verifiedTrigger && evidenceMatchesSnapshot && reasons.length === 0;
  if (ready) {
    reasons.push(
      "Company is eligible for a human decision on Apollo enrichment only.",
      "Apollo credits, CRM persistence, sequence enrollment and outreach remain separately prohibited.",
    );
  }

  return {
    status: ready ? "READY_FOR_HUMAN_ENRICHMENT_REVIEW" : "BLOCKED",
    companyName: reconstructed?.companyName ?? snapshot.companyName,
    companyNumber: reconstructed?.companyNumber ?? null,
    companyDomain: reconstructed?.companyDomain ?? null,
    strongVerifiedSignals: reconstructed?.strongVerifiedSignals ?? 0,
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
