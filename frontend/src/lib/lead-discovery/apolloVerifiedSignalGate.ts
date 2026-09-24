import {
  buildIntentRadarSignal,
  buildIntentRadarSnapshot,
  type IntentRadarSignalInput,
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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameNullableText(left: string | null, right: unknown): boolean {
  return (right === null || typeof right === "string") && left === right;
}

function sameSafeInteger(left: number, right: unknown): boolean {
  return typeof right === "number" && Number.isSafeInteger(right) && left === right;
}

export function planApolloEnrichmentFromIntentRadar(
  snapshot: IntentRadarSnapshot,
  asOf: string,
): ApolloEnrichmentReviewPlan {
  const reasons: string[] = [];
  const unknownSnapshot: unknown = snapshot;
  const raw: UnknownRecord = isRecord(unknownSnapshot) ? unknownSnapshot : {};
  let reconstructed: IntentRadarSnapshot | null = null;

  if (!isRecord(unknownSnapshot)) {
    reasons.push("Intent Radar snapshot must be a runtime record.");
  }

  try {
    const rawSignals = raw.signals;
    if (!Array.isArray(rawSignals)) throw new Error("invalid_snapshot_signals");
    const canonicalSignals = rawSignals.map((signal) =>
      buildIntentRadarSignal(signal as IntentRadarSignalInput)
    );
    const signalIntegrityMatches = canonicalSignals.every((signal, index) => {
      const original = rawSignals[index];
      return Boolean(
        isRecord(original) &&
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
    typeof raw.companyName === "string" && reconstructed.companyName === raw.companyName &&
    sameNullableText(reconstructed.companyNumber, raw.companyNumber) &&
    sameNullableText(reconstructed.companyDomain, raw.companyDomain) &&
    sameSafeInteger(reconstructed.totalSignals, raw.totalSignals) &&
    sameSafeInteger(reconstructed.verifiedFacts, raw.verifiedFacts) &&
    sameSafeInteger(reconstructed.inferences, raw.inferences) &&
    sameSafeInteger(reconstructed.strongVerifiedSignals, raw.strongVerifiedSignals) &&
    typeof raw.apolloEnrichmentAllowed === "boolean" && reconstructed.apolloEnrichmentAllowed === raw.apolloEnrichmentAllowed,
  );

  if (!evidenceMatchesSnapshot) {
    reasons.push("Intent Radar derived fields do not match the underlying signal evidence.");
  }

  const capabilityLocksValid =
    raw.crmWriteAllowed === false &&
    raw.outreachAllowed === false &&
    raw.promotionAllowed === false;
  if (!capabilityLocksValid) {
    reasons.push("Intent Radar snapshot violates the fail-closed capability boundary.");
  }

  const durableIdentity = Boolean(reconstructed?.companyNumber || reconstructed?.companyDomain);
  const verifiedTrigger = Boolean(
    reconstructed &&
    reconstructed.strongVerifiedSignals > 0 &&
    reconstructed.apolloEnrichmentAllowed,
  );

  if (!durableIdentity) reasons.push("Durable company number or domain is required before Apollo enrichment review.");
  if (!verifiedTrigger) reasons.push("At least one independent strong verified company signal is required before Apollo enrichment review.");

  const ready = durableIdentity && verifiedTrigger && evidenceMatchesSnapshot && capabilityLocksValid && reasons.length === 0;
  if (ready) {
    reasons.push(
      "Company is eligible for a human decision on Apollo enrichment only.",
      "Apollo credits, CRM persistence, sequence enrollment and outreach remain separately prohibited.",
    );
  }

  return {
    status: ready ? "READY_FOR_HUMAN_ENRICHMENT_REVIEW" : "BLOCKED",
    companyName: reconstructed?.companyName ?? "",
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
