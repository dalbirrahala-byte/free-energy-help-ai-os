import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveExecutionChannel } from "./executionPlan.ts";
import type { LeadActionRecommendationLabel } from "./leadActionRecommendation.ts";

const ALL_LABELS: LeadActionRecommendationLabel[] = [
  "Call now — priority contact",
  "Renewal follow-up",
  "Request LOA",
  "Request energy bill",
  "Verify contract/end-date information",
  "Manual review",
  "Nurture — follow-up later",
  "Hold — no action",
  "Rejected — no sales action",
];

test("every recognized recommendation label maps to the only real, connected execution channel: manual-task", () => {
  for (const label of ALL_LABELS) {
    assert.equal(deriveExecutionChannel(label), "manual-task");
  }
});

test("deriveExecutionChannel is deterministic and never returns a future-adapter placeholder today", () => {
  for (const label of ALL_LABELS) {
    assert.equal(deriveExecutionChannel(label), "manual-task");
    assert.notEqual(deriveExecutionChannel(label), "ai-voice");
    assert.notEqual(deriveExecutionChannel(label), "whatsapp");
    assert.notEqual(deriveExecutionChannel(label), "email");
    assert.notEqual(deriveExecutionChannel(label), "sms");
  }
});
