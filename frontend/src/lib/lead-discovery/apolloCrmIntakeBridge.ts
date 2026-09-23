export type ApolloEmailStatus = "verified" | "unverified" | "guessed" | "unknown";

export type ApolloProspectInput = Readonly<{
  personId: string;
  organisationName: string;
  contactName: string;
  jobTitle: string | null;
  workEmail: string;
  emailStatus: ApolloEmailStatus;
  capturedAt: string;
}>;

export type ApolloCrmIntakeDraft = Readonly<{
  status: "BLOCKED" | "READY_FOR_HUMAN_REVIEW";
  source: "Apollo";
  externalReference: string;
  idempotencyKey: string;
  organisationName: string;
  contactName: string;
  jobTitle: string | null;
  workEmail: string;
  emailVerified: boolean;
  leadStatus: "New";
  leadOwner: null;
  nextAction: string;
  followUpRequired: true;
  sourceDetail: "Apollo verified prospect";
  sourceProvenance: string;
  suppressionStatus: "NOT_CHECKED";
  complianceStatus: "REVIEW_REQUIRED";
  reasons: readonly string[];
  crmWriteAllowed: false;
  outreachAllowed: false;
  executionPerformed: false;
}>;

function isPlausibleWorkEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCapturedAt(value: string): string | null {
  const cleaned = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(cleaned)) {
    return null;
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/**
 * Phase 1 of the Apollo -> CRM bridge.
 *
 * This function is intentionally pure and fail-closed. It creates a reviewable
 * CRM intake draft from Apollo evidence only. It cannot write to Supabase,
 * authorize outreach, enroll a sequence, send an email, or infer that
 * suppression/compliance checks have passed.
 */
export function createApolloCrmIntakeDraft(
  input: ApolloProspectInput,
): ApolloCrmIntakeDraft {
  const personId = input.personId.trim();
  const organisationName = input.organisationName.trim();
  const contactName = input.contactName.trim();
  const workEmail = input.workEmail.trim().toLowerCase();
  const jobTitle = input.jobTitle?.trim() || null;
  const capturedAt = normalizeCapturedAt(input.capturedAt);
  const reasons: string[] = [];

  if (!personId) reasons.push("Apollo person identity is required.");
  if (!organisationName) reasons.push("Organisation name is required.");
  if (!contactName) reasons.push("Contact name is required.");
  if (!workEmail || !isPlausibleWorkEmail(workEmail)) {
    reasons.push("A plausible work email is required.");
  }
  if (input.emailStatus !== "verified") {
    reasons.push("Apollo work email must be verified before CRM intake review.");
  }
  if (!capturedAt) {
    reasons.push("Capture timestamp must be a valid ISO-8601 instant with timezone for provenance.");
  }

  const externalReference = personId ? `apollo:person:${personId}` : "";
  const idempotencyKey = externalReference ? `crm-intake:${externalReference}` : "";
  const sourceProvenance = externalReference && capturedAt
    ? `${externalReference}:captured:${capturedAt}`
    : "";

  const ready = reasons.length === 0;

  if (ready) {
    reasons.push(
      "Verified Apollo prospect is ready for human CRM intake review.",
      "Suppression and compliance remain unresolved and must pass before any outreach decision.",
    );
  }

  return {
    status: ready ? "READY_FOR_HUMAN_REVIEW" : "BLOCKED",
    source: "Apollo",
    externalReference,
    idempotencyKey,
    organisationName,
    contactName,
    jobTitle,
    workEmail,
    emailVerified: input.emailStatus === "verified",
    leadStatus: "New",
    leadOwner: null,
    nextAction: "Review Apollo prospect, verify suppression/compliance, and decide contact path",
    followUpRequired: true,
    sourceDetail: "Apollo verified prospect",
    sourceProvenance,
    suppressionStatus: "NOT_CHECKED",
    complianceStatus: "REVIEW_REQUIRED",
    reasons,
    crmWriteAllowed: false,
    outreachAllowed: false,
    executionPerformed: false,
  };
}
