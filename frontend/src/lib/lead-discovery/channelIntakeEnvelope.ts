export const FEH_INTAKE_CHANNELS = [
  "linkedin",
  "facebook",
  "whatsapp",
  "reddit",
] as const;

export type FehIntakeChannel = (typeof FEH_INTAKE_CHANNELS)[number];

export type ChannelIntakeEnvelope = Readonly<{
  channel: FehIntakeChannel;
  externalReference: string;
  capturedAt: string;
  sourceUrl: string | null;
  organisationName: string | null;
  contactReference: string | null;
  consentReference: string | null;
  provenanceReference: string;
  payloadReference: string;
  outreachAllowed: false;
  crmWriteAllowed: false;
}>;

export type ChannelIntakeCandidate = Omit<
  ChannelIntakeEnvelope,
  "outreachAllowed" | "crmWriteAllowed"
>;

/**
 * Factory 044 Phase 19 establishes a provider-neutral intake contract for
 * LinkedIn, Facebook, WhatsApp and Reddit.
 *
 * Intake is evidence only. It cannot write to CRM or authorize outreach.
 */
export function createChannelIntakeEnvelope(
  candidate: ChannelIntakeCandidate,
): ChannelIntakeEnvelope | null {
  if (
    !FEH_INTAKE_CHANNELS.includes(candidate.channel) ||
    !candidate.externalReference.trim() ||
    !candidate.capturedAt.trim() ||
    !candidate.provenanceReference.trim() ||
    !candidate.payloadReference.trim()
  ) {
    return null;
  }

  return {
    ...candidate,
    externalReference: candidate.externalReference.trim(),
    provenanceReference: candidate.provenanceReference.trim(),
    payloadReference: candidate.payloadReference.trim(),
    sourceUrl: candidate.sourceUrl?.trim() || null,
    organisationName: candidate.organisationName?.trim() || null,
    contactReference: candidate.contactReference?.trim() || null,
    consentReference: candidate.consentReference?.trim() || null,
    outreachAllowed: false,
    crmWriteAllowed: false,
  };
}
