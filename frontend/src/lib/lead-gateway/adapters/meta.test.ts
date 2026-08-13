import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeMetaLead, type MetaLeadInput } from "./meta.ts";

function validInput(overrides: Partial<MetaLeadInput> = {}): MetaLeadInput {
  return {
    leadId: "meta-lead-12345",
    createdTime: "2026-08-13T09:00:00.000Z",
    companyName: "Acme Ltd",
    fullName: "Jane Smith",
    phoneNumber: "07123 456789",
    email: "jane@acme.example",
    campaignId: "camp-987",
    campaignName: "Q3 Energy Review Campaign",
    formId: "form-555",
    hasExplicitConsentEvidence: true,
    ...overrides,
  };
}

// 1. valid Meta lead normalization
test("a fully valid Meta lead normalizes successfully with every field mapped", () => {
  const result = normalizeMetaLead(validInput());
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.lead.companyName, "Acme Ltd");
  assert.equal(result.lead.contactName, "Jane Smith");
  assert.equal(result.lead.telephone, "07123 456789");
  assert.equal(result.lead.email, "jane@acme.example");
  assert.equal(result.lead.campaignId, "camp-987");
  assert.equal(result.lead.campaignName, "Q3 Energy Review Campaign");
  assert.equal(result.lead.formId, "form-555");
});

// 2. provider/external ID preservation
test("provider and externalLeadId are preserved exactly", () => {
  const result = normalizeMetaLead(validInput({ leadId: "meta-lead-exact-999" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.lead.provider, "meta");
  assert.equal(result.lead.externalLeadId, "meta-lead-exact-999");
});

// 3. authoritative leadSource
test("leadSource is always the fixed 'meta_ads' constant, never derived from input", () => {
  const result = normalizeMetaLead(validInput());
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.lead.leadSource, "meta_ads");
});

// 4. consent evidence preserved
test("explicit consent evidence maps to 'affirmative'", () => {
  const result = normalizeMetaLead(validInput({ hasExplicitConsentEvidence: true }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.lead.consentStatus, "affirmative");
});

// 5. absent consent remains unknown
test("absent consent evidence remains 'unknown', never defaulted to affirmative", () => {
  const omitted = normalizeMetaLead(validInput({ hasExplicitConsentEvidence: undefined }));
  assert.equal(omitted.success, true);
  if (omitted.success) assert.equal(omitted.lead.consentStatus, "unknown");

  const explicitFalse = normalizeMetaLead(validInput({ hasExplicitConsentEvidence: false }));
  assert.equal(explicitFalse.success, true);
  if (explicitFalse.success) assert.equal(explicitFalse.lead.consentStatus, "unknown");
});

// 6. malformed required input rejected
test("missing external lead ID is rejected with missing_external_lead_id", () => {
  const result = normalizeMetaLead(validInput({ leadId: null }));
  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.errors.includes("missing_external_lead_id"));
});

test("missing received time is rejected with missing_received_at", () => {
  const result = normalizeMetaLead(validInput({ createdTime: undefined }));
  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.errors.includes("missing_received_at"));
});

test("an unparseable received time is rejected the same as a missing one", () => {
  const result = normalizeMetaLead(validInput({ createdTime: "not-a-real-timestamp" }));
  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.errors.includes("missing_received_at"));
});

test("a malformed email is rejected with invalid_email", () => {
  const result = normalizeMetaLead(validInput({ email: "not-an-email", phoneNumber: null }));
  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.errors.includes("invalid_email"));
});

test("a malformed telephone is rejected with invalid_telephone", () => {
  const result = normalizeMetaLead(validInput({ phoneNumber: "123", email: null }));
  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.errors.includes("invalid_telephone"));
});

test("neither email nor telephone present is rejected with missing_contact_identifier", () => {
  const result = normalizeMetaLead(validInput({ email: null, phoneNumber: null }));
  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.errors.includes("missing_contact_identifier"));
});

test("email alone (no telephone) is sufficient — not rejected as missing a contact identifier", () => {
  const result = normalizeMetaLead(validInput({ phoneNumber: null }));
  assert.equal(result.success, true);
});

test("telephone alone (no email) is sufficient — not rejected as missing a contact identifier", () => {
  const result = normalizeMetaLead(validInput({ email: null }));
  assert.equal(result.success, true);
});

// 7. optional attribution fields handled
test("absent company name, campaign fields, and form ID are all null, not errors", () => {
  const result = normalizeMetaLead(
    validInput({ companyName: null, campaignId: null, campaignName: null, formId: null }),
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.lead.companyName, null);
  assert.equal(result.lead.campaignId, null);
  assert.equal(result.lead.campaignName, null);
  assert.equal(result.lead.formId, null);
});

test("oversized free-text fields are truncated deterministically, not rejected", () => {
  const longName = "A".repeat(500);
  const result = normalizeMetaLead(validInput({ campaignName: longName }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.lead.campaignName?.length, 200);
});

// 8 & 11. unexpected/raw provider fields are not propagated; canonical object contains only approved fields
test("unexpected raw fields on the input never appear on the canonical output", () => {
  const rawInputWithExtraFields = {
    ...validInput(),
    ad_id: "999999",
    platform: "ig",
    partner_name: "some-third-party-crm",
    raw_field_data: [{ name: "custom_question", values: ["answer"] }],
  } as MetaLeadInput;

  const result = normalizeMetaLead(rawInputWithExtraFields);
  assert.equal(result.success, true);
  if (!result.success) return;

  const expectedKeys = [
    "provider",
    "externalLeadId",
    "receivedAt",
    "leadSource",
    "companyName",
    "contactName",
    "telephone",
    "email",
    "campaignId",
    "campaignName",
    "formId",
    "consentStatus",
  ].sort();

  assert.deepEqual(Object.keys(result.lead).sort(), expectedKeys);
});

// 9. no raw payload retained (same evidence as the exact-key-set assertion above, verified from a different angle)
test("no property on the canonical lead holds the original raw input object", () => {
  const input = validInput();
  const result = normalizeMetaLead(input);
  assert.equal(result.success, true);
  if (!result.success) return;
  const values: unknown[] = Object.values(result.lead);
  assert.ok(!values.some((value) => value === input));
});

// 10. deterministic output
test("identical input always produces an identical (deep-equal) result", () => {
  const input = validInput();
  const first = normalizeMetaLead(input);
  const second = normalizeMetaLead(input);
  assert.deepEqual(first, second);
});

// 12. provider + externalLeadId available for future idempotency
test("provider and externalLeadId are both present and usable as a future idempotency key", () => {
  const result = normalizeMetaLead(validInput({ leadId: "idempotency-key-abc" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(typeof result.lead.provider, "string");
  assert.ok(result.lead.provider.length > 0);
  assert.equal(result.lead.externalLeadId, "idempotency-key-abc");
});
