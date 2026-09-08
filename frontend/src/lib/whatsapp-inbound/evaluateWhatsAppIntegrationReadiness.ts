import type { WhatsAppPersistenceClosureCertificate } from "./createWhatsAppPersistenceClosureCertificate.ts";

export type WhatsAppIntegrationReadinessEvidence = Readonly<{
  closureCertificate: WhatsAppPersistenceClosureCertificate;
  factory041GatePassed: boolean;
  factory045TestsPassed: boolean;
  typecheckPassed: boolean;
  lintPassed: boolean;
  deploymentCheckPassed: boolean;
  independentReviewRecorded: boolean;
}>;

export type WhatsAppIntegrationReadinessDecision = Readonly<{
  status:
    | "READY_FOR_LIVE_INTEGRATION_REVIEW"
    | "HUMAN_REVIEW_REQUIRED"
    | "BLOCKED";
  reasons: readonly string[];
  credentialsAllowed: false;
  liveWebhookActivationAllowed: false;
  productionPersistenceAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

/**
 * Factory 045 Phase 14 consolidates the Phase 1-13 safety evidence into a
 * single readiness decision. READY_FOR_LIVE_INTEGRATION_REVIEW means only
 * that the architecture may be reviewed for a future protected integration
 * phase. It grants no credentials, webhook, database, reply, or provider
 * capability and performs no I/O.
 */
export function evaluateWhatsAppIntegrationReadiness(
  evidence: WhatsAppIntegrationReadinessEvidence,
): WhatsAppIntegrationReadinessDecision {
  const reasons: string[] = [];

  if (evidence.closureCertificate.status !== "CERTIFIED_CLOSED") {
    reasons.push("Terminal persistence closure is not certified closed.");
  }

  if (!evidence.factory041GatePassed) {
    reasons.push("Factory 041 deterministic safety gate evidence is missing or failed.");
  }

  if (!evidence.factory045TestsPassed) {
    reasons.push("Factory 045 focused test evidence is missing or failed.");
  }

  if (!evidence.typecheckPassed) {
    reasons.push("TypeScript typecheck evidence is missing or failed.");
  }

  if (!evidence.lintPassed) {
    reasons.push("Lint evidence is missing or failed.");
  }

  if (!evidence.deploymentCheckPassed) {
    reasons.push("Deployment/preview verification evidence is missing or failed.");
  }

  if (!evidence.independentReviewRecorded) {
    reasons.push("Independent human review has not been recorded.");
  }

  const capabilityLocksIntact =
    evidence.closureCertificate.automaticRetryAllowed === false &&
    evidence.closureCertificate.outboundReplyAllowed === false &&
    evidence.closureCertificate.providerExecutionAllowed === false;

  if (!capabilityLocksIntact) {
    reasons.push("Terminal closure certificate violates capability locks.");
  }

  const base = {
    credentialsAllowed: false as const,
    liveWebhookActivationAllowed: false as const,
    productionPersistenceAllowed: false as const,
    outboundReplyAllowed: false as const,
    providerExecutionAllowed: false as const,
  };

  if (reasons.length === 0) {
    return {
      status: "READY_FOR_LIVE_INTEGRATION_REVIEW",
      reasons: [
        "Factory 045 safety evidence is complete for a separate protected live-integration review.",
        "This decision does not authorize credentials, live webhooks, production persistence, replies, or provider execution.",
      ],
      ...base,
    };
  }

  if (
    evidence.closureCertificate.status === "HUMAN_REVIEW_REQUIRED" ||
    !evidence.independentReviewRecorded
  ) {
    return {
      status: "HUMAN_REVIEW_REQUIRED",
      reasons,
      ...base,
    };
  }

  return {
    status: "BLOCKED",
    reasons,
    ...base,
  };
}
