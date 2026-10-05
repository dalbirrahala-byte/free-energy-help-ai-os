import assert from "node:assert/strict";
import { test } from "node:test";

import { planPolyAiCrmWrite, type PolyAiCrmCallEnvelope } from "./polyai-crm-contracts.ts";

function baseEnvelope(overrides: Partial<PolyAiCrmCallEnvelope> = {}): PolyAiCrmCallEnvelope {
  return {
    provider: "polyai",
    providerConversationId: "conv-123",
    startedAt: "2026-10-05T14:30:00+01:00",
    outcome: "resolved",
    callbackRequested: false,
    transferRequested: false,
    ...overrides,
  };
}

test("rejects a PolyAI event without a provider conversation ID", () => {
  const result = planPolyAiCrmWrite(baseEnvelope({ providerConversationId: "   " }));
  assert.equal(result.disposition, "rejected");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("prepares callback follow-up without enabling CRM persistence", () => {
  const result = planPolyAiCrmWrite(
    baseEnvelope({
      outcome: "callback_requested",
      callbackRequested: true,
      callbackPhone: "01332605506",
      contactName: "Test Caller",
      businessName: "Test Business",
    }),
  );

  assert.equal(result.disposition, "prepared");
  assert.equal(result.followUpRequired, true);
  assert.equal(result.crmWriteAllowed, false);
  assert.match(result.nextAction, /adviser follow-up/i);
});

test("prepares a normal call summary for review", () => {
  const result = planPolyAiCrmWrite(baseEnvelope());
  assert.equal(result.disposition, "prepared");
  assert.equal(result.followUpRequired, false);
  assert.equal(result.nextAction, "Review PolyAI call summary");
});
