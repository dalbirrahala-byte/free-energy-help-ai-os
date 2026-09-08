import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWhatsAppIntegrationReadiness } from "./evaluateWhatsAppIntegrationReadiness.ts";

const certified = {
  status: "CERTIFIED_CLOSED" as const,
  reasons: ["closure verified"],
  automaticRetryAllowed: false as const,
  outboundReplyAllowed: false as const,
  providerExecutionAllowed: false as const,
};

test("complete evidence is ready only for protected live-integration review", () => {
  const result = evaluateWhatsAppIntegrationReadiness({
    closureCertificate: certified,
    factory041GatePassed: true,
    factory045TestsPassed: true,
    typecheckPassed: true,
    lintPassed: true,
    deploymentCheckPassed: true,
    independentReviewRecorded: true,
  });

  assert.equal(result.status, "READY_FOR_LIVE_INTEGRATION_REVIEW");
  assert.equal(result.credentialsAllowed, false);
  assert.equal(result.liveWebhookActivationAllowed, false);
  assert.equal(result.productionPersistenceAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("missing independent review requires human review", () => {
  const result = evaluateWhatsAppIntegrationReadiness({
    closureCertificate: certified,
    factory041GatePassed: true,
    factory045TestsPassed: true,
    typecheckPassed: true,
    lintPassed: true,
    deploymentCheckPassed: true,
    independentReviewRecorded: false,
  });

  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.match(result.reasons.join(" "), /independent human review/i);
});

test("failed deterministic safety evidence blocks readiness", () => {
  const result = evaluateWhatsAppIntegrationReadiness({
    closureCertificate: certified,
    factory041GatePassed: false,
    factory045TestsPassed: true,
    typecheckPassed: true,
    lintPassed: true,
    deploymentCheckPassed: true,
    independentReviewRecorded: true,
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.credentialsAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("uncertified closure can never be ready", () => {
  const result = evaluateWhatsAppIntegrationReadiness({
    closureCertificate: {
      ...certified,
      status: "HUMAN_REVIEW_REQUIRED",
      reasons: ["closure not certified"],
    },
    factory041GatePassed: true,
    factory045TestsPassed: true,
    typecheckPassed: true,
    lintPassed: true,
    deploymentCheckPassed: true,
    independentReviewRecorded: true,
  });

  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.equal(result.liveWebhookActivationAllowed, false);
});

test("missing deployment evidence blocks readiness", () => {
  const result = evaluateWhatsAppIntegrationReadiness({
    closureCertificate: certified,
    factory041GatePassed: true,
    factory045TestsPassed: true,
    typecheckPassed: true,
    lintPassed: true,
    deploymentCheckPassed: false,
    independentReviewRecorded: true,
  });

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /deployment\/preview verification/i);
});
