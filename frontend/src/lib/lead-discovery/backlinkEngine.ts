export const BACKLINK_OPPORTUNITY_TYPES = [
  "LOCAL_BUSINESS_DIRECTORY",
  "TRADE_ASSOCIATION",
  "SUPPLIER_PARTNER",
  "PROFESSIONAL_PARTNER",
  "EDITORIAL_DIGITAL_PR",
  "RESOURCE_PAGE",
  "PUBLIC_SECTOR_RESOURCE",
  "EDUCATION_RESOURCE",
  "EVENT_OR_MEMBERSHIP_LISTING",
] as const;

export type BacklinkOpportunityType = (typeof BACKLINK_OPPORTUNITY_TYPES)[number];

export const BACKLINK_RISK_FLAGS = [
  "PBN_OR_LINK_FARM",
  "BULK_LOW_QUALITY_DIRECTORY",
  "COMMENT_SPAM",
  "FORUM_PROFILE_SPAM",
  "HIDDEN_OR_CLOAKED_LINK",
  "IRRELEVANT_SITE",
  "MALWARE_OR_UNSAFE_SITE",
  "PAID_FOLLOW_LINK",
  "MANDATORY_LINK_EXCHANGE_SCHEME",
] as const;

export type BacklinkRiskFlag = (typeof BACKLINK_RISK_FLAGS)[number];
export type BacklinkEvidenceBasis = "OBSERVED_VERIFIED" | "ESTIMATED";
export type BacklinkEditorialControl =
  | "THIRD_PARTY_EDITORIAL"
  | "DIRECTORY_OWNER"
  | "PARTNER_OWNER"
  | "UNKNOWN";
export type BacklinkPaidLinkTreatment =
  | "NONE"
  | "SPONSORED_OR_NOFOLLOW"
  | "FOLLOW_OR_UNDISCLOSED"
  | "UNKNOWN";
export type BacklinkSubmissionMethod =
  | "NONE"
  | "MANUAL_REVIEW"
  | "BULK_SUBMISSION"
  | "COMMENT_OR_PROFILE_AUTOMATION";

export type BacklinkProspectInput = Readonly<{
  domain: string;
  sourceUrl: string;
  sourceReference: string;
  opportunityType: BacklinkOpportunityType;
  evidenceBasis: BacklinkEvidenceBasis;
  observedAt: string;
  countryCode?: string | null;
  trustScore: number;
  ukBusinessRelevance: number;
  topicalRelevance: number;
  editorialControl: BacklinkEditorialControl;
  paidPlacement: boolean;
  paidLinkTreatment: BacklinkPaidLinkTreatment;
  reciprocalLinkRequired: boolean;
  submissionMethod: BacklinkSubmissionMethod;
  riskFlags: readonly BacklinkRiskFlag[];
  targetPath: string;
}>;

export type BacklinkProspect = Readonly<BacklinkProspectInput & {
  domain: string;
  sourceUrl: string;
  sourceReference: string;
  observedAt: string;
  countryCode: string | null;
  targetPath: string;
  riskFlags: readonly BacklinkRiskFlag[];
  idempotencyKey: string;
  qualityScore: number;
}>;

export type BacklinkProspectAssessment = Readonly<{
  status: "READY_FOR_HUMAN_REVIEW" | "REVIEW_REQUIRED" | "BLOCKED";
  qualityScore: number;
  reasons: readonly string[];
  outreachAllowed: false;
  purchaseAllowed: false;
  accountCreationAllowed: false;
  automaticSubmissionAllowed: false;
  crmWriteAllowed: false;
}>;

export type BacklinkProspectRegister = Readonly<{
  totalProspects: number;
  readyForHumanReview: number;
  reviewRequired: number;
  blocked: number;
  prospects: readonly Readonly<{
    prospect: BacklinkProspect;
    assessment: BacklinkProspectAssessment;
  }>[];
  automaticOutreachAllowed: false;
  automaticPurchaseAllowed: false;
  automaticSubmissionAllowed: false;
}>;

const BLOCKING_RISKS: ReadonlySet<BacklinkRiskFlag> = new Set([
  "PBN_OR_LINK_FARM",
  "BULK_LOW_QUALITY_DIRECTORY",
  "COMMENT_SPAM",
  "FORUM_PROFILE_SPAM",
  "HIDDEN_OR_CLOAKED_LINK",
  "IRRELEVANT_SITE",
  "MALWARE_OR_UNSAFE_SITE",
  "PAID_FOLLOW_LINK",
  "MANDATORY_LINK_EXCHANGE_SCHEME",
]);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanDomain(value: unknown): string {
  const cleaned = cleanText(value, 253)?.toLowerCase() ?? null;
  if (!cleaned) throw new Error("invalid_backlink_domain");
  const withoutProtocol = cleaned.replace(/^https?:\/\//, "");
  const hostname = withoutProtocol.endsWith("/") ? withoutProtocol.slice(0, -1) : withoutProtocol;
  if (!hostname || /[\/?#@:]/.test(hostname)) throw new Error("invalid_backlink_domain");
  const labels = hostname.split(".");
  const validLabel = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  const tld = labels.at(-1) ?? "";
  if (
    labels.length < 2 ||
    labels.some((label) => label.length > 63 || !validLabel.test(label)) ||
    !/[a-z]/.test(tld)
  ) {
    throw new Error("invalid_backlink_domain");
  }
  return hostname;
}

function normalizeSourceUrl(value: unknown, domain: string): string {
  const cleaned = cleanText(value, 2048);
  if (!cleaned) throw new Error("invalid_backlink_source_url");
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("invalid_backlink_source_url");
  }
  if (parsed.protocol !== "https:") throw new Error("backlink_source_must_use_https");
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== domain && !hostname.endsWith(`.${domain}`)) {
    throw new Error("backlink_source_domain_mismatch");
  }
  parsed.hash = "";
  return parsed.toString();
}

function normalizeReference(value: unknown): string {
  const cleaned = cleanText(value, 300);
  if (!cleaned || !/^[A-Za-z0-9._:-]+$/.test(cleaned)) {
    throw new Error("invalid_backlink_source_reference");
  }
  return cleaned;
}

function normalizeTargetPath(value: unknown): string {
  const cleaned = cleanText(value, 240);
  if (!cleaned || !cleaned.startsWith("/") || cleaned.includes("?") || cleaned.includes("#")) {
    throw new Error("invalid_backlink_target_path");
  }
  if (/\s/.test(cleaned) || cleaned.startsWith("//")) throw new Error("invalid_backlink_target_path");
  return cleaned;
}

function normalizeInstant(value: unknown, code: string): string {
  const cleaned = cleanText(value, 64);
  if (!cleaned) throw new Error(code);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(cleaned);
  if (!match) throw new Error(code);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12) throw new Error(code);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) {
    throw new Error(code);
  }
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
}

function assertScore(value: unknown, code: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100) {
    throw new Error(code);
  }
}

function normalizeCountryCode(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = cleanText(value, 2)?.toUpperCase() ?? null;
  if (!cleaned || !/^[A-Z]{2}$/.test(cleaned)) throw new Error("invalid_backlink_country_code");
  return cleaned;
}

function assertEnum<T extends string>(value: unknown, allowed: readonly T[], code: string): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error(code);
}

export function buildBacklinkProspect(input: BacklinkProspectInput): BacklinkProspect {
  if (!input || typeof input !== "object") throw new Error("invalid_backlink_prospect");
  assertEnum(input.opportunityType, BACKLINK_OPPORTUNITY_TYPES, "invalid_backlink_opportunity_type");
  assertEnum(input.evidenceBasis, ["OBSERVED_VERIFIED", "ESTIMATED"] as const, "invalid_backlink_evidence_basis");
  assertEnum(
    input.editorialControl,
    ["THIRD_PARTY_EDITORIAL", "DIRECTORY_OWNER", "PARTNER_OWNER", "UNKNOWN"] as const,
    "invalid_backlink_editorial_control",
  );
  assertEnum(
    input.paidLinkTreatment,
    ["NONE", "SPONSORED_OR_NOFOLLOW", "FOLLOW_OR_UNDISCLOSED", "UNKNOWN"] as const,
    "invalid_backlink_paid_link_treatment",
  );
  assertEnum(
    input.submissionMethod,
    ["NONE", "MANUAL_REVIEW", "BULK_SUBMISSION", "COMMENT_OR_PROFILE_AUTOMATION"] as const,
    "invalid_backlink_submission_method",
  );
  if (typeof input.paidPlacement !== "boolean" || typeof input.reciprocalLinkRequired !== "boolean") {
    throw new Error("invalid_backlink_boolean_evidence");
  }
  if (!Array.isArray(input.riskFlags)) throw new Error("invalid_backlink_risk_flags");
  for (const risk of input.riskFlags) {
    assertEnum(risk, BACKLINK_RISK_FLAGS, "invalid_backlink_risk_flag");
  }
  assertScore(input.trustScore, "invalid_backlink_trust_score");
  assertScore(input.ukBusinessRelevance, "invalid_backlink_uk_relevance");
  assertScore(input.topicalRelevance, "invalid_backlink_topical_relevance");

  const domain = cleanDomain(input.domain);
  if (domain === "freeenergyhelp.co.uk" || domain.endsWith(".freeenergyhelp.co.uk")) {
    throw new Error("self_backlink_not_allowed");
  }
  const sourceUrl = normalizeSourceUrl(input.sourceUrl, domain);
  const sourceReference = normalizeReference(input.sourceReference);
  const observedAt = normalizeInstant(input.observedAt, "invalid_backlink_observed_at");
  const countryCode = normalizeCountryCode(input.countryCode);
  const targetPath = normalizeTargetPath(input.targetPath);
  const riskFlags = [...new Set(input.riskFlags)].sort();

  const qualityScore = Math.round(
    (input.trustScore * 0.4) +
    (input.ukBusinessRelevance * 0.3) +
    (input.topicalRelevance * 0.3),
  );

  return {
    ...input,
    domain,
    sourceUrl,
    sourceReference,
    observedAt,
    countryCode,
    targetPath,
    riskFlags,
    qualityScore,
    idempotencyKey: [
      "feh-backlink",
      domain,
      input.opportunityType.toLowerCase(),
      sourceReference.toLowerCase(),
      targetPath.toLowerCase(),
    ].join(":"),
  };
}

export function assessBacklinkProspect(prospect: BacklinkProspect): BacklinkProspectAssessment {
  const reasons: string[] = [];
  const blockingRisk = prospect.riskFlags.find((risk) => BLOCKING_RISKS.has(risk));

  if (blockingRisk) reasons.push(`Blocking backlink risk: ${blockingRisk}.`);
  if (prospect.submissionMethod === "BULK_SUBMISSION") {
    reasons.push("Bulk submission is prohibited by the FEH backlink engine.");
  }
  if (prospect.submissionMethod === "COMMENT_OR_PROFILE_AUTOMATION") {
    reasons.push("Automated comment/profile link placement is prohibited.");
  }
  if (prospect.paidPlacement && prospect.paidLinkTreatment === "FOLLOW_OR_UNDISCLOSED") {
    reasons.push("Paid follow or undisclosed paid links are prohibited.");
  }

  const blocked =
    Boolean(blockingRisk) ||
    prospect.submissionMethod === "BULK_SUBMISSION" ||
    prospect.submissionMethod === "COMMENT_OR_PROFILE_AUTOMATION" ||
    (prospect.paidPlacement && prospect.paidLinkTreatment === "FOLLOW_OR_UNDISCLOSED");

  if (!blocked) {
    if (prospect.evidenceBasis !== "OBSERVED_VERIFIED") {
      reasons.push("Prospect evidence is estimated and requires verification.");
    }
    if (prospect.countryCode !== "GB") {
      reasons.push("UK business relevance is not backed by a GB source location.");
    }
    if (prospect.trustScore < 70) reasons.push("Trust score is below the FEH review threshold.");
    if (prospect.ukBusinessRelevance < 70) reasons.push("UK business relevance is below the FEH review threshold.");
    if (prospect.topicalRelevance < 70) reasons.push("Topical relevance is below the FEH review threshold.");
    if (prospect.editorialControl === "UNKNOWN") reasons.push("Editorial/link placement control is unknown.");
    if (prospect.reciprocalLinkRequired) reasons.push("Reciprocal link requirement needs human review.");
    if (prospect.paidPlacement) reasons.push("Paid placement requires separate commercial and link-treatment review.");
    if (prospect.paidLinkTreatment === "UNKNOWN") reasons.push("Paid-link treatment is unknown.");
  }

  const ready =
    !blocked &&
    prospect.evidenceBasis === "OBSERVED_VERIFIED" &&
    prospect.countryCode === "GB" &&
    prospect.trustScore >= 70 &&
    prospect.ukBusinessRelevance >= 70 &&
    prospect.topicalRelevance >= 70 &&
    prospect.editorialControl !== "UNKNOWN" &&
    !prospect.reciprocalLinkRequired &&
    !prospect.paidPlacement &&
    prospect.paidLinkTreatment === "NONE" &&
    (prospect.submissionMethod === "NONE" || prospect.submissionMethod === "MANUAL_REVIEW");

  if (ready) {
    reasons.push("Relevant, trustworthy UK-business backlink prospect is ready for human review.");
  }
  reasons.push("Phase 1 never authorizes outreach, purchasing, account creation, automatic submission or CRM writes.");

  return {
    status: blocked ? "BLOCKED" : ready ? "READY_FOR_HUMAN_REVIEW" : "REVIEW_REQUIRED",
    qualityScore: prospect.qualityScore,
    reasons,
    outreachAllowed: false,
    purchaseAllowed: false,
    accountCreationAllowed: false,
    automaticSubmissionAllowed: false,
    crmWriteAllowed: false,
  };
}

export function buildBacklinkProspectRegister(inputs: readonly BacklinkProspectInput[]): BacklinkProspectRegister {
  const unique = new Map<string, BacklinkProspect>();
  for (const input of inputs) {
    const prospect = buildBacklinkProspect(input);
    if (!unique.has(prospect.idempotencyKey)) unique.set(prospect.idempotencyKey, prospect);
  }

  const prospects = [...unique.values()]
    .map((prospect) => ({ prospect, assessment: assessBacklinkProspect(prospect) }))
    .sort((a, b) => {
      const statusOrder = { READY_FOR_HUMAN_REVIEW: 0, REVIEW_REQUIRED: 1, BLOCKED: 2 } as const;
      const statusDiff = statusOrder[a.assessment.status] - statusOrder[b.assessment.status];
      if (statusDiff !== 0) return statusDiff;
      if (a.assessment.qualityScore !== b.assessment.qualityScore) {
        return b.assessment.qualityScore - a.assessment.qualityScore;
      }
      return a.prospect.domain.localeCompare(b.prospect.domain);
    });

  return {
    totalProspects: prospects.length,
    readyForHumanReview: prospects.filter(({ assessment }) => assessment.status === "READY_FOR_HUMAN_REVIEW").length,
    reviewRequired: prospects.filter(({ assessment }) => assessment.status === "REVIEW_REQUIRED").length,
    blocked: prospects.filter(({ assessment }) => assessment.status === "BLOCKED").length,
    prospects,
    automaticOutreachAllowed: false,
    automaticPurchaseAllowed: false,
    automaticSubmissionAllowed: false,
  };
}
