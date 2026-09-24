import assert from "node:assert/strict";
import test from "node:test";

import {
  assessBacklinkProspect,
  buildBacklinkProspect,
  buildBacklinkProspectRegister,
} from "./backlinkEngine.ts";

const good = {
  domain: "derbyshire-business-directory.example",
  sourceUrl: "https://derbyshire-business-directory.example/commercial-energy/",
  sourceReference: "directory:derbyshire:energy:2026",
  opportunityType: "LOCAL_BUSINESS_DIRECTORY" as const,
  evidenceBasis: "OBSERVED_VERIFIED" as const,
  observedAt: "2026-09-24T17:00:00Z",
  countryCode: "GB",
  trustScore: 82,
  ukBusinessRelevance: 95,
  topicalRelevance: 88,
  editorialControl: "DIRECTORY_OWNER" as const,
  paidPlacement: false,
  paidLinkTreatment: "NONE" as const,
  reciprocalLinkRequired: false,
  submissionMethod: "MANUAL_REVIEW" as const,
  riskFlags: [] as const,
  targetPath: "/free-business-energy-health-check",
};

test("strong UK business prospect is research-ready but never outreach-authorized", () => {
  const prospect = buildBacklinkProspect(good);
  const assessment = assessBacklinkProspect(prospect);

  assert.equal(assessment.status, "READY_FOR_HUMAN_REVIEW");
  assert.ok(assessment.qualityScore >= 80);
  assert.equal(assessment.outreachAllowed, false);
  assert.equal(assessment.purchaseAllowed, false);
  assert.equal(assessment.automaticSubmissionAllowed, false);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.match(prospect.idempotencyKey, /^feh-backlink:/);
});

test("link farms, spam and paid follow links fail closed", () => {
  for (const riskFlags of [
    ["PBN_OR_LINK_FARM"],
    ["COMMENT_SPAM"],
    ["HIDDEN_OR_CLOAKED_LINK"],
    ["IRRELEVANT_SITE"],
  ] as const) {
    const prospect = buildBacklinkProspect({ ...good, riskFlags });
    assert.equal(assessBacklinkProspect(prospect).status, "BLOCKED");
  }

  const paidFollow = buildBacklinkProspect({
    ...good,
    paidPlacement: true,
    paidLinkTreatment: "FOLLOW_OR_UNDISCLOSED",
    riskFlags: ["PAID_FOLLOW_LINK"],
  });
  assert.equal(assessBacklinkProspect(paidFollow).status, "BLOCKED");
});

test("bulk submission and automated comment/profile placement are prohibited", () => {
  const bulk = buildBacklinkProspect({ ...good, submissionMethod: "BULK_SUBMISSION" });
  const comments = buildBacklinkProspect({ ...good, submissionMethod: "COMMENT_OR_PROFILE_AUTOMATION" });

  assert.equal(assessBacklinkProspect(bulk).status, "BLOCKED");
  assert.equal(assessBacklinkProspect(comments).status, "BLOCKED");
});

test("estimated, non-UK or uncertain prospects stay review-required", () => {
  const estimated = buildBacklinkProspect({ ...good, evidenceBasis: "ESTIMATED" });
  const nonUk = buildBacklinkProspect({ ...good, countryCode: "US" });
  const unknownEditorial = buildBacklinkProspect({ ...good, editorialControl: "UNKNOWN" });

  assert.equal(assessBacklinkProspect(estimated).status, "REVIEW_REQUIRED");
  assert.equal(assessBacklinkProspect(nonUk).status, "REVIEW_REQUIRED");
  assert.equal(assessBacklinkProspect(unknownEditorial).status, "REVIEW_REQUIRED");
});

test("paid placement with sponsored or nofollow treatment still requires commercial review", () => {
  const prospect = buildBacklinkProspect({
    ...good,
    paidPlacement: true,
    paidLinkTreatment: "SPONSORED_OR_NOFOLLOW",
  });
  const assessment = assessBacklinkProspect(prospect);

  assert.equal(assessment.status, "REVIEW_REQUIRED");
  assert.equal(assessment.purchaseAllowed, false);
  assert.ok(assessment.reasons.some((reason) => reason.includes("Paid placement")));
});

test("duplicate prospects collapse deterministically and safe prospects sort first", () => {
  const register = buildBacklinkProspectRegister([
    good,
    good,
    {
      ...good,
      domain: "unknown-global.example",
      sourceUrl: "https://unknown-global.example/resource",
      sourceReference: "resource:unknown:1",
      countryCode: null,
      trustScore: 50,
      ukBusinessRelevance: 45,
      topicalRelevance: 80,
      editorialControl: "UNKNOWN",
    },
    {
      ...good,
      domain: "linkfarm.example",
      sourceUrl: "https://linkfarm.example/buy-links",
      sourceReference: "linkfarm:1",
      riskFlags: ["PBN_OR_LINK_FARM"],
    },
  ]);

  assert.equal(register.totalProspects, 3);
  assert.equal(register.readyForHumanReview, 1);
  assert.equal(register.reviewRequired, 1);
  assert.equal(register.blocked, 1);
  assert.equal(register.prospects[0]?.assessment.status, "READY_FOR_HUMAN_REVIEW");
  assert.equal(register.automaticOutreachAllowed, false);
  assert.equal(register.automaticPurchaseAllowed, false);
});

test("source domain, HTTPS, target path and self-link identity fail closed", () => {
  assert.throws(
    () => buildBacklinkProspect({ ...good, sourceUrl: "http://derbyshire-business-directory.example/page" }),
    /backlink_source_must_use_https/,
  );
  assert.throws(
    () => buildBacklinkProspect({ ...good, sourceUrl: "https://different.example/page" }),
    /backlink_source_domain_mismatch/,
  );
  assert.throws(
    () => buildBacklinkProspect({ ...good, targetPath: "https://freeenergyhelp.co.uk/contact" }),
    /invalid_backlink_target_path/,
  );
  assert.throws(
    () => buildBacklinkProspect({
      ...good,
      domain: "freeenergyhelp.co.uk",
      sourceUrl: "https://freeenergyhelp.co.uk/partners",
    }),
    /self_backlink_not_allowed/,
  );
});

test("runtime lookalikes fail closed instead of being trusted by TypeScript types", () => {
  assert.throws(
    () => buildBacklinkProspect({ ...good, trustScore: "90" as never }),
    /invalid_backlink_trust_score/,
  );
  assert.throws(
    () => buildBacklinkProspect({ ...good, paidPlacement: "false" as never }),
    /invalid_backlink_boolean_evidence/,
  );
  assert.throws(
    () => buildBacklinkProspect({ ...good, opportunityType: "LINK_FARM" as never }),
    /invalid_backlink_opportunity_type/,
  );
  assert.throws(
    () => buildBacklinkProspect({ ...good, observedAt: "2026-09-24T17:00:00" }),
    /invalid_backlink_observed_at/,
  );
});
