import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCommercialIntelligenceViewModel } from "./viewModel.ts";

const TODAY = new Date("2026-01-01T00:00:00");

const CRITICAL_LEAD = {
  id: 1,
  company_name: "Acme Ltd",
  contact_name: "Jane Smith",
  telephone: "01234 567890",
  email: "jane@acme.test",
  supplier: "British Gas",
  contract_end: "2026-01-15", // 14 days out — Critical per the shared thresholds
  status: "Qualified",
};

const NO_CONTRACT_LEAD = {
  ...CRITICAL_LEAD,
  id: 2,
  contract_end: null,
};

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

test("engine disabled (default): visible is false, no engine call surfaces, existing page is unaffected", () => {
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: undefined }, () => {
    const vm = buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
    assert.equal(vm.engineEnabled, false);
    assert.equal(vm.visible, false);
    assert.equal(vm.response, null);
    assert.match(vm.unavailableReason ?? "", /disabled/);
  });
});

test("engine enabled, shadow mode on (default once enabled): computed but not visible", () => {
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: "true", ENTERPRISE_INTELLIGENCE_SHADOW_MODE: undefined }, () => {
    const vm = buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
    assert.equal(vm.engineEnabled, true);
    assert.equal(vm.shadowMode, true);
    assert.equal(vm.visible, false);
    assert.notEqual(vm.response, null);
    assert.match(vm.unavailableReason ?? "", /shadow mode/);
  });
});

test("engine enabled, shadow mode off: visible with real evidence-based output", () => {
  withEnv(
    { USE_ENTERPRISE_INTELLIGENCE_ENGINE: "true", ENTERPRISE_INTELLIGENCE_SHADOW_MODE: "false" },
    () => {
      const vm = buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
      assert.equal(vm.visible, true);
      assert.equal(vm.unavailableReason, null);
      assert.ok(vm.response);
      assert.equal(vm.response?.capabilityResults.renewalIntelligence?.metadata?.urgency, "Critical");
    },
  );
});

test("shadow comparison: matching urgency logs no mismatch warning", () => {
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: "true" }, () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);
    try {
      buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
    } finally {
      console.warn = originalWarn;
    }
    assert.equal(warnings.some((w) => w.includes("Shadow mismatch")), false);
  });
});

test("shadow comparison: a genuine mismatch is logged server-side, never thrown", () => {
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: "true" }, () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);
    try {
      buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Urgent", TODAY);
    } finally {
      console.warn = originalWarn;
    }
    assert.ok(warnings.some((w) => w.includes("Shadow mismatch") && w.includes("Urgent") && w.includes("Critical")));
  });
});

test("missing contract end date fails safe: insufficient data, never throws", () => {
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: "true", ENTERPRISE_INTELLIGENCE_SHADOW_MODE: "false" }, () => {
    const vm = buildCommercialIntelligenceViewModel(NO_CONTRACT_LEAD, [], [], null, TODAY);
    assert.equal(vm.visible, true);
    assert.equal(vm.response?.capabilityResults.renewalIntelligence?.status, "insufficient_data");
  });
});

test("no fabrication: placeholder capabilities report not_configured / insufficient_data, never a fabricated value", () => {
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: "true", ENTERPRISE_INTELLIGENCE_SHADOW_MODE: "false" }, () => {
    const vm = buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
    const opportunity = vm.response?.capabilityResults.opportunityIntelligence;
    const compliance = vm.response?.capabilityResults.complianceEvaluation;
    assert.ok(opportunity && opportunity.status !== "ok");
    assert.ok(compliance && compliance.status !== "ok");
  });
});

test("AI Workforce readiness flags are surfaced regardless of the FEH engine's own state", () => {
  withEnv(
    { USE_ENTERPRISE_INTELLIGENCE_ENGINE: undefined, USE_AI_WORKFORCE_ORCHESTRATOR: "true", AI_WORKFORCE_SHADOW_MODE: "false" },
    () => {
      const vm = buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
      assert.equal(vm.aiWorkforceEnabled, true);
      assert.equal(vm.aiWorkforceShadowMode, false);
    },
  );
});

test("rollback: flipping USE_ENTERPRISE_INTELLIGENCE_ENGINE back to false immediately restores the disabled state", () => {
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: "true" }, () => {
    const enabled = buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
    assert.equal(enabled.engineEnabled, true);
  });
  withEnv({ USE_ENTERPRISE_INTELLIGENCE_ENGINE: "false" }, () => {
    const disabled = buildCommercialIntelligenceViewModel(CRITICAL_LEAD, [], [], "Critical", TODAY);
    assert.equal(disabled.engineEnabled, false);
    assert.equal(disabled.visible, false);
  });
});
