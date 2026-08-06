import assert from "node:assert/strict";
import { test } from "node:test";

import type { EnterpriseIntelligenceRequest, LeadContextInput } from "../types";
import { runEnterpriseIntelligence } from "./intelligenceOrchestrator.ts";
import { shadowCompareRenewal } from "./shadowComparison.ts";

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

test("valid request with a full context returns an ok decision", () => {
  const request: EnterpriseIntelligenceRequest = {
    capabilities: ["renewalIntelligence", "workflowRecommendation"],
    context: { lead: makeLead() },
    today: TODAY,
  };

  const response = runEnterpriseIntelligence(request);

  assert.equal(response.errors.length, 0);
  assert.equal(response.capabilityResults.renewalIntelligence?.status, "ok");
  assert.ok(response.decision.recommendation.length > 0);
});

test("missing customer context is a valid, honest state, not an error", () => {
  const request: EnterpriseIntelligenceRequest = {
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead() },
    today: TODAY,
  };

  const response = runEnterpriseIntelligence(request);
  assert.equal(response.errors.length, 0);
});

test("invalid request: no capabilities requested fails safely", () => {
  const request: EnterpriseIntelligenceRequest = {
    capabilities: [],
    context: { lead: makeLead() },
    today: TODAY,
  };

  const response = runEnterpriseIntelligence(request);
  assert.equal(response.errors.length, 1);
  assert.equal(response.errors[0].code, "NO_CAPABILITIES_REQUESTED");
  assert.equal(response.decision.recommendation, "Recommendation unavailable — insufficient data");
});

test("invalid request: missing lead context fails safely", () => {
  const request = {
    capabilities: ["renewalIntelligence"],
    context: {},
    today: TODAY,
  } as unknown as EnterpriseIntelligenceRequest;

  const response = runEnterpriseIntelligence(request);
  assert.equal(response.errors.length, 1);
  assert.equal(response.errors[0].code, "MISSING_LEAD_CONTEXT");
});

test("unknown capability produces a typed error but does not block other capabilities", () => {
  const request: EnterpriseIntelligenceRequest = {
    // @ts-expect-error deliberately invalid capability id for this test
    capabilities: ["renewalIntelligence", "notARealCapability"],
    context: { lead: makeLead() },
    today: TODAY,
  };

  const response = runEnterpriseIntelligence(request);

  assert.equal(response.errors.length, 1);
  assert.equal(response.errors[0].code, "UNKNOWN_CAPABILITY");
  assert.equal(response.capabilityResults.renewalIntelligence?.status, "ok");
});

test("renewal capability success: real dates produce an ok status with urgency metadata", () => {
  const request: EnterpriseIntelligenceRequest = {
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead({ contract_end: "2027-01-10" }) },
    today: TODAY,
  };

  const response = runEnterpriseIntelligence(request);
  const outcome = response.capabilityResults.renewalIntelligence;

  assert.equal(outcome?.status, "ok");
  assert.equal(outcome?.metadata?.urgency, "Critical");
});

test("missing renewal date fails safe to insufficient_data, never throws", () => {
  const request: EnterpriseIntelligenceRequest = {
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead({ contract_end: null }) },
    today: TODAY,
  };

  const response = runEnterpriseIntelligence(request);
  const outcome = response.capabilityResults.renewalIntelligence;

  assert.equal(outcome?.status, "insufficient_data");
  assert.deepEqual(outcome?.missingData, ["Contract end date"]);
});

test("invalid renewal date fails safe, does not throw", () => {
  const request: EnterpriseIntelligenceRequest = {
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead({ contract_end: "not-a-real-date" }) },
    today: TODAY,
  };

  assert.doesNotThrow(() => runEnterpriseIntelligence(request));

  const response = runEnterpriseIntelligence(request);
  assert.equal(response.capabilityResults.renewalIntelligence?.status, "insufficient_data");
});

test("multiple capability aggregation combines evidence and provenance from every requested capability", () => {
  const request: EnterpriseIntelligenceRequest = {
    capabilities: ["renewalIntelligence", "leadIntelligence", "customerHealth", "workflowRecommendation"],
    context: {
      lead: makeLead(),
      activities: [{ activity_date: "2026-12-20", activity_type: "Telephone Call" }],
      tasks: [{ due_date: "2027-01-05", status: "Open" }],
    },
    today: TODAY,
  };

  const response = runEnterpriseIntelligence(request);

  assert.equal(Object.keys(response.capabilityResults).length, 4);
  assert.ok(response.decision.evidence.length >= 4);
  assert.ok(response.decision.provenance.length >= 2);
});

test("deterministic decision recommendation is always drawn from the closed vocabulary", () => {
  const closedVocabulary = [
    "Recommend tender preparation",
    "Recommend qualification call",
    "Recommend immediate review (overdue)",
    "Recommend confirming missing information",
    "Recommendation unavailable — insufficient data",
  ];

  const scenarios: LeadContextInput[] = [
    makeLead({ contract_end: "2027-01-10" }), // Critical -> tender prep
    makeLead({ contract_end: "2027-12-01" }), // Future -> qualification call
    makeLead({ contract_end: "2026-01-01" }), // Overdue -> immediate review
    makeLead({ contract_end: null }), // Unknown -> unavailable
  ];

  for (const lead of scenarios) {
    const response = runEnterpriseIntelligence({
      capabilities: ["renewalIntelligence", "workflowRecommendation"],
      context: { lead },
      today: TODAY,
    });
    assert.ok(closedVocabulary.includes(response.decision.recommendation), response.decision.recommendation);
  }
});

test("placeholder capabilities never fabricate a value", () => {
  const response = runEnterpriseIntelligence({
    capabilities: ["opportunityIntelligence", "complianceEvaluation"],
    context: { lead: makeLead() },
    today: TODAY,
  });

  const opportunity = response.capabilityResults.opportunityIntelligence;
  const compliance = response.capabilityResults.complianceEvaluation;

  assert.equal(opportunity?.status, "insufficient_data");
  assert.equal(opportunity?.evidence[0]?.value, null);
  assert.equal(compliance?.status, "not_configured");
  assert.deepEqual(compliance?.evidence, []);
});

test("provenance fields are present and reference real sources", () => {
  const response = runEnterpriseIntelligence({
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead() },
    today: TODAY,
  });

  const provenance = response.capabilityResults.renewalIntelligence?.provenance ?? [];
  assert.ok(provenance.length > 0);
  assert.ok(provenance.every((record) => record.source.length > 0));
});

test("confidence fields are always present with an explanation", () => {
  const response = runEnterpriseIntelligence({
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead() },
    today: TODAY,
  });

  const confidence = response.capabilityResults.renewalIntelligence?.confidence;
  assert.ok(confidence);
  assert.ok(["High", "Medium", "Low", "Insufficient"].includes(confidence.level));
  assert.ok(confidence.explanation.length > 0);
});

test("timestamp fields are populated and match the injected 'today'", () => {
  const response = runEnterpriseIntelligence({
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead() },
    today: TODAY,
  });

  assert.equal(response.audit.calculatedAt, TODAY.toISOString());
});

test("audit metadata includes request id, capability list, engine version, and feature-flag state", () => {
  const response = runEnterpriseIntelligence({
    capabilities: ["renewalIntelligence"],
    context: { lead: makeLead() },
    today: TODAY,
  });

  assert.ok(response.audit.requestId.startsWith("EIE-"));
  assert.deepEqual(response.audit.capabilitiesRequested, ["renewalIntelligence"]);
  assert.ok(response.audit.engineVersion.includes("feh-enterprise-intelligence"));
  assert.equal(typeof response.audit.featureFlagState.engineEnabled, "boolean");
  assert.equal(typeof response.audit.featureFlagState.shadowMode, "boolean");
});

test("feature flag off: engine still computes when called directly (flag gates future callers, not the function itself)", () => {
  process.env.USE_ENTERPRISE_INTELLIGENCE_ENGINE = "false";
  try {
    const response = runEnterpriseIntelligence({
      capabilities: ["renewalIntelligence"],
      context: { lead: makeLead() },
      today: TODAY,
    });
    assert.equal(response.audit.featureFlagState.engineEnabled, false);
    assert.equal(response.capabilityResults.renewalIntelligence?.status, "ok");
  } finally {
    delete process.env.USE_ENTERPRISE_INTELLIGENCE_ENGINE;
  }
});

test("shadow mode on: a genuine mismatch is logged server-side, never thrown or exposed", () => {
  const originalWarn = console.warn;
  const logged: string[] = [];
  console.warn = (message: string) => {
    logged.push(message);
  };

  try {
    shadowCompareRenewal(
      {
        id: 1,
        company_name: "X",
        contact_name: null,
        telephone: null,
        email: null,
        supplier: null,
        contract_end: "2027-01-10",
        status: null,
        fieldsSupplied: [],
        fieldsMissing: [],
      },
      {
        capabilityId: "renewalIntelligence",
        status: "ok",
        evidence: [],
        reasoning: [],
        recommendation: "x",
        confidence: { level: "High", explanation: "x", evidenceAvailable: 1, evidenceTotal: 1 },
        missingData: [],
        provenance: [],
        explanation: "x",
        metadata: { urgency: "Future" }, // deliberately wrong vs. the real Critical classification
      },
      TODAY,
    );

    assert.equal(logged.length, 1);
    assert.match(logged[0], /Shadow comparison mismatch/);
  } finally {
    console.warn = originalWarn;
  }
});

test("shadow mode: no mismatch means no log line", () => {
  const originalWarn = console.warn;
  const logged: string[] = [];
  console.warn = (message: string) => {
    logged.push(message);
  };

  try {
    shadowCompareRenewal(
      {
        id: 1,
        company_name: "X",
        contact_name: null,
        telephone: null,
        email: null,
        supplier: null,
        contract_end: "2027-01-10",
        status: null,
        fieldsSupplied: [],
        fieldsMissing: [],
      },
      {
        capabilityId: "renewalIntelligence",
        status: "ok",
        evidence: [],
        reasoning: [],
        recommendation: "x",
        confidence: { level: "High", explanation: "x", evidenceAvailable: 1, evidenceTotal: 1 },
        missingData: [],
        provenance: [],
        explanation: "x",
        metadata: { urgency: "Critical" }, // matches the real classification
      },
      TODAY,
    );

    assert.equal(logged.length, 0);
  } finally {
    console.warn = originalWarn;
  }
});

test("rollback: setting the shadow-mode flag to false is honoured by the flag reader used in audit metadata", () => {
  process.env.ENTERPRISE_INTELLIGENCE_SHADOW_MODE = "false";
  try {
    const response = runEnterpriseIntelligence({
      capabilities: ["renewalIntelligence"],
      context: { lead: makeLead() },
      today: TODAY,
    });
    assert.equal(response.audit.featureFlagState.shadowMode, false);
  } finally {
    delete process.env.ENTERPRISE_INTELLIGENCE_SHADOW_MODE;
  }
});
