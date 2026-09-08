import assert from "node:assert/strict";
import test from "node:test";

import { createWhatsAppPersistenceClosureCertificate } from "./createWhatsAppPersistenceClosureCertificate.ts";

test("verified closure becomes a capability-free terminal certificate", () => {
  const result = createWhatsAppPersistenceClosureCertificate({
    status: "VERIFIED_CLOSED",
    reasons: ["terminal record verified"],
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  });

  assert.equal(result.status, "CERTIFIED_CLOSED");
  assert.deepEqual(result.reasons, ["terminal record verified"]);
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("human review remains human review and cannot be certified closed", () => {
  const result = createWhatsAppPersistenceClosureCertificate({
    status: "HUMAN_REVIEW_REQUIRED",
    reasons: ["closure could not be verified"],
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  });

  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});
