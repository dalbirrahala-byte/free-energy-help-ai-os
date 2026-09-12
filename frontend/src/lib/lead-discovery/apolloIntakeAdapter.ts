import {
  createChannelIntakeEnvelope,
  type ChannelIntakeEnvelope,
} from "./channelIntakeEnvelope.ts";

export type ApolloIntakeCandidate = Readonly<{
  externalReference: string;
  capturedAt: string;
  sourceUrl?: string | null;
  organisationName?: string | null;
  personReference?: string | null;
  provenanceReference: string;
  payloadReference: string;
}>;

/**
 * Maps Apollo discovery evidence into the existing FEH intake boundary.
 *
 * This adapter is deliberately non-executing: it does not enrich contact data,
 * authorize outreach, or permit CRM mutation. Those remain separate controlled
 * decisions downstream of intake.
 */
export function createApolloIntakeEnvelope(
  candidate: ApolloIntakeCandidate,
): ChannelIntakeEnvelope | null {
  return createChannelIntakeEnvelope({
    channel: "apollo",
    externalReference: candidate.externalReference,
    capturedAt: candidate.capturedAt,
    sourceUrl: candidate.sourceUrl ?? null,
    organisationName: candidate.organisationName ?? null,
    contactReference: candidate.personReference ?? null,
    consentReference: null,
    provenanceReference: candidate.provenanceReference,
    payloadReference: candidate.payloadReference,
  });
}
