import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateActionEligibility, isMarketingAction } from "./actionEligibility.ts";

test("a direct-response action on a non-Rejected lead is eligible", () => {
  const result = evaluateActionEligibility({ id: 1, consent_given: false }, "Hot", "Call now — priority contact");

  assert.equal(result.eligible, true);
  assert.equal(result.basis, "direct-response-allowed");
  assert.equal(result.isMarketingAction, false);
});

test("a Reject-classified lead is always blocked, regardless of the requested action or consent", () => {
  const directResponse = evaluateActionEligibility({ id: 2, consent_given: true }, "Reject", "Call now — priority contact");
  const marketing = evaluateActionEligibility({ id: 2, consent_given: true }, "Reject", "Nurture — follow-up later");

  assert.equal(directResponse.eligible, false);
  assert.equal(directResponse.basis, "rejected");
  assert.equal(marketing.eligible, false);
  assert.equal(marketing.basis, "rejected");
});

test("a marketing-classified action on a lead without consent is blocked", () => {
  const result = evaluateActionEligibility({ id: 3, consent_given: false }, "Warm", "Nurture — follow-up later");

  assert.equal(result.eligible, false);
  assert.equal(result.basis, "marketing-consent-missing");
  assert.equal(result.isMarketingAction, true);
});

test("a marketing-classified action on a lead with consent, not Rejected, is eligible", () => {
  const result = evaluateActionEligibility({ id: 4, consent_given: true }, "Warm", "Nurture — follow-up later");

  assert.equal(result.eligible, true);
  assert.equal(result.basis, "marketing-allowed");
  assert.equal(result.isMarketingAction, true);
});

test("direct-response actions never require marketing consent, even when consent is false or missing", () => {
  const noConsent = evaluateActionEligibility({ id: 5, consent_given: false }, "Hot", "Request LOA");
  const undefinedConsent = evaluateActionEligibility({ id: 5, consent_given: undefined }, "Hot", "Request energy bill");

  assert.equal(noConsent.eligible, true);
  assert.equal(noConsent.basis, "direct-response-allowed");
  assert.equal(undefinedConsent.eligible, true);
  assert.equal(undefinedConsent.basis, "direct-response-allowed");
});

test("isMarketingAction correctly distinguishes 'Nurture — follow-up later' from every direct-response label", () => {
  assert.equal(isMarketingAction("Nurture — follow-up later"), true);
  assert.equal(isMarketingAction("Call now — priority contact"), false);
  assert.equal(isMarketingAction("Renewal follow-up"), false);
  assert.equal(isMarketingAction("Request LOA"), false);
  assert.equal(isMarketingAction("Request energy bill"), false);
  assert.equal(isMarketingAction("Verify contract/end-date information"), false);
  assert.equal(isMarketingAction("Manual review"), false);
});

test("every eligibility result carries a meaningful, non-empty, non-generic reason", () => {
  const cases: Array<[string, ReturnType<typeof evaluateActionEligibility>]> = [
    ["reject", evaluateActionEligibility({ id: 6, consent_given: true }, "Reject", "Call now — priority contact")],
    ["no-consent-marketing", evaluateActionEligibility({ id: 6, consent_given: false }, "Warm", "Nurture — follow-up later")],
    ["consented-marketing", evaluateActionEligibility({ id: 6, consent_given: true }, "Warm", "Nurture — follow-up later")],
    ["direct-response", evaluateActionEligibility({ id: 6, consent_given: false }, "Hot", "Call now — priority contact")],
  ];

  for (const [label, result] of cases) {
    assert.ok(result.reason.length > 20, `${label}: reason should be a real sentence, got "${result.reason}"`);
    assert.notEqual(result.reason.trim(), "", `${label}: reason must not be empty`);
  }
});

test("the eligibility result never implies a customer was contacted, a message was sent, or a call was placed", () => {
  const cases = [
    evaluateActionEligibility({ id: 7, consent_given: true }, "Hot", "Call now — priority contact"),
    evaluateActionEligibility({ id: 7, consent_given: true }, "Warm", "Nurture — follow-up later"),
    evaluateActionEligibility({ id: 7, consent_given: false }, "Warm", "Nurture — follow-up later"),
    evaluateActionEligibility({ id: 7, consent_given: true }, "Reject", "Call now — priority contact"),
  ];

  const forbidden = /\b(called|call was placed|message sent|dispatched|delivered|contacted the (lead|customer)|whatsapp sent|email sent|sms sent)\b/i;

  for (const result of cases) {
    assert.doesNotMatch(JSON.stringify(result), forbidden);
  }
});

test("identical input always produces identical output (deterministic)", () => {
  const a = evaluateActionEligibility({ id: 8, consent_given: true }, "Warm", "Nurture — follow-up later");
  const b = evaluateActionEligibility({ id: 8, consent_given: true }, "Warm", "Nurture — follow-up later");

  assert.deepEqual(a, b);
});
