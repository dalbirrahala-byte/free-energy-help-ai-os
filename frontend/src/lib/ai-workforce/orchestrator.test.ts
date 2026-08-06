import assert from "node:assert/strict";
import { test } from "node:test";

import { runAiWorkforceOrchestrator } from "./orchestrator.ts";
import type { LeadContextInput, OrchestratorRequest } from "./types";

const TODAY = new Date(2027, 0, 1);

function makeLead(overrides: Partial<LeadContextInput> = {}): LeadContextInput {
  return {
    id: 1,
    company_name: "Test Co",
    contact_name: "Test Contact",
    telephone: "01234 567890",
    email: "test@example.com",
    supplier: "Test Supplier",
    contract_end: "2027-01-10",
    status: "Qualified",
    ...overrides,
  };
}

test("valid request with real workers returns operational results", () => {
  const request: OrchestratorRequest = {
    workers: ["commercialEnergyIntelligence", "renewalIntelligence"],
    input: { lead: makeLead(), today: TODAY },
  };

  const response = runAiWorkforceOrchestrator(request);

  assert.equal(response.errors.length, 0);
  assert.equal(response.workerResults.commercialEnergyIntelligence?.status, "operational");
  assert.equal(response.workerResults.renewalIntelligence?.status, "operational");
});

test("invalid request: no workers requested fails safely", () => {
  const response = runAiWorkforceOrchestrator({ workers: [], input: { lead: makeLead(), today: TODAY } });
  assert.equal(response.errors.length, 1);
  assert.equal(response.errors[0].code, "NO_WORKERS_REQUESTED");
});

test("invalid request: missing input fails safely", () => {
  const request = { workers: ["renewalIntelligence"] } as unknown as OrchestratorRequest;
  const response = runAiWorkforceOrchestrator(request);
  assert.equal(response.errors.length, 1);
  assert.equal(response.errors[0].code, "MISSING_INPUT");
});

test("unknown worker produces a typed error but does not block the others", () => {
  const request: OrchestratorRequest = {
    // @ts-expect-error deliberately invalid worker id for this test
    workers: ["renewalIntelligence", "notARealWorker"],
    input: { lead: makeLead(), today: TODAY },
  };

  const response = runAiWorkforceOrchestrator(request);

  assert.equal(response.errors.length, 1);
  assert.equal(response.errors[0].code, "UNKNOWN_WORKER");
  assert.equal(response.workerResults.renewalIntelligence?.status, "operational");
});

test("all 6 placeholder workers return not_yet_configured with a real reason, never a fabricated summary", () => {
  const request: OrchestratorRequest = {
    workers: ["salesDirector", "marketingDirector", "customerSuccess", "compliance", "voice", "executiveReporting"],
    input: { lead: makeLead(), today: TODAY },
  };

  const response = runAiWorkforceOrchestrator(request);

  for (const workerId of request.workers) {
    const result = response.workerResults[workerId];
    assert.equal(result?.status, "not_yet_configured");
    assert.equal(result?.summary, "Not Yet Configured");
    assert.equal(result?.data, null);
    assert.ok(result?.reasonNotConfigured && result.reasonNotConfigured.length > 20);
    assert.equal(result?.confidence.level, "Insufficient");
  }
});

test("worker without lead context returns a typed error status, not a throw", () => {
  const request: OrchestratorRequest = {
    workers: ["commercialEnergyIntelligence"],
    input: { today: TODAY },
  };

  assert.doesNotThrow(() => runAiWorkforceOrchestrator(request));
  const response = runAiWorkforceOrchestrator(request);
  assert.equal(response.workerResults.commercialEnergyIntelligence?.status, "error");
});

test("audit metadata includes request id, worker list, orchestrator version, and feature-flag state", () => {
  const response = runAiWorkforceOrchestrator({
    workers: ["renewalIntelligence"],
    input: { lead: makeLead(), today: TODAY },
  });

  assert.ok(response.audit.requestId.startsWith("AWO-"));
  assert.deepEqual(response.audit.workersRequested, ["renewalIntelligence"]);
  assert.ok(response.audit.orchestratorVersion.includes("ai-workforce-orchestrator"));
  assert.equal(typeof response.audit.featureFlagState.orchestratorEnabled, "boolean");
  assert.equal(typeof response.audit.featureFlagState.shadowMode, "boolean");
});

test("timestamp fields are populated and match the injected 'today'", () => {
  const response = runAiWorkforceOrchestrator({
    workers: ["renewalIntelligence"],
    input: { lead: makeLead(), today: TODAY },
  });

  assert.equal(response.audit.calculatedAt, TODAY.toISOString());
  assert.equal(response.workerResults.renewalIntelligence?.calculatedAt, TODAY.toISOString());
});

test("rollback: orchestrator flag off is reflected in audit but does not block direct calls (flag gates future callers)", () => {
  process.env.USE_AI_WORKFORCE_ORCHESTRATOR = "false";
  try {
    const response = runAiWorkforceOrchestrator({
      workers: ["renewalIntelligence"],
      input: { lead: makeLead(), today: TODAY },
    });
    assert.equal(response.audit.featureFlagState.orchestratorEnabled, false);
    assert.equal(response.workerResults.renewalIntelligence?.status, "operational");
  } finally {
    delete process.env.USE_AI_WORKFORCE_ORCHESTRATOR;
  }
});

test("multiple workers, mixed real and placeholder, aggregate independently without cross-contamination", () => {
  const response = runAiWorkforceOrchestrator({
    workers: ["renewalIntelligence", "voice", "commercialEnergyIntelligence", "compliance"],
    input: { lead: makeLead(), today: TODAY },
  });

  assert.equal(response.errors.length, 0);
  assert.equal(response.workerResults.renewalIntelligence?.status, "operational");
  assert.equal(response.workerResults.commercialEnergyIntelligence?.status, "operational");
  assert.equal(response.workerResults.voice?.status, "not_yet_configured");
  assert.equal(response.workerResults.compliance?.status, "not_yet_configured");
});
