// Factory 041 Phase 11: destination resolution boundary, strictly
// non-executing.
//
// Answers exactly one question: "given a sealed Phase 9 contract and an
// already-approved destination reference, may FEH resolve the exact
// destination for the authorised channel?" It does NOT answer "should
// this prospect be contacted" (decided upstream, by Phases 2-9) and it
// does NOT itself contact anybody. This module contains zero telephony/
// email/WhatsApp/SMS/AI-Voice/n8n code, zero provider SDK usage, zero
// HTTP calls to any external system, and zero environment/secret access.
//
// WHY THIS EXISTS: Phase 9's `ProviderNeutralDispatchContract` was
// deliberately designed to exclude raw destination PII (see that
// module's header) so the sealed contract stays minimal and non-secret.
// Something has to eventually resolve a real destination for a future
// adapter to use -- this module is that explicit, separate boundary. It
// does NOT grant authority; it only resolves a destination AFTER
// authority has already been established upstream (Phases 2-9), and it
// still cannot itself cause any outreach.
//
// DESTINATION REFERENCE IS NOT PROOF OF PERMISSION: `DestinationReference`
// (`{ contactId, channel }`) identifies WHICH contact/channel a caller
// believes a destination should be resolved for -- it carries no
// authority of its own. It must be bound to the already-sealed Phase 9
// contract's channel (exact match, no fallback) AND to the contract's own
// `contactId` (exact match) before any read is even attempted.
//
// CANONICAL REFERENCE: `contactId` maps directly to `public.contacts.id`,
// the same identifier already persisted as `execution_authorizations
// .contact_id` (Phase 7) -- no second identifier or destination cache is
// introduced.
//
// CONTACT-ID PROVENANCE (hardening): `contract.contactId` -- sealed by
// Phase 9 from Phase 8's own `evidence.contactId`, itself sourced only
// from the persisted `execution_authorizations.contact_id` -- is the
// SOLE authoritative source for which contact this module may ever
// resolve a destination for. `destinationReference.contactId` is used
// STRICTLY as a cross-check: it must exist, be structurally valid, and
// exactly equal `contract.contactId`, or the resolution fails closed
// before any database read is attempted. The database lookup itself is
// always keyed on `contract.contactId` -- never on an independently
// caller-selected identifier -- so a caller cannot cause this module to
// look up, let alone resolve, a different contact's destination even by
// supplying an otherwise-valid `destinationReference` for someone else.
// This is the same "authoritative sealed value, caller value is only a
// corroborating cross-check" pattern already established for
// `idempotencyKey` in Phase 9's own hardening.
//
// CHANNEL -> COLUMN MAPPING, PER ESTABLISHED PRECEDENT: this module
// reuses the exact same channel-to-field mapping Phase 4
// (`evaluateContactPermission.ts`, `deriveContactabilityDecision`)
// already established: EMAIL resolves `contacts.email`; PHONE, WHATSAPP,
// and SMS all resolve `contacts.phone` (there is no separate WhatsApp/SMS
// destination column in the existing schema, and inventing one is out of
// scope for this phase). `contacts.direct_dial` is deliberately NOT read
// -- selecting only `phone` avoids the ambiguity of two candidate
// telephone columns without inventing new resolution logic.
//
// NO RECOMPUTED PERMISSION: this module never re-derives identity
// resolution, suppression, consent/legal basis, contact permission,
// outreach eligibility, execution authorization, Phase 8's release
// decision, or Phase 9's contract construction. It reads only
// `contract.authorizationRecordId/actionId/idempotencyKey/contactId/
// channel/executionPerformed` (already-decided facts) and a `contacts`
// row's destination field -- nothing else.
//
// DATABASE BEHAVIOUR: at most ONE read, against `public.contacts`,
// filtered by primary key (`id = contract.contactId` -- see contact-id
// provenance note above), selecting only `id, email, phone` -- no notes,
// no commercial data, no unrelated PII. Uses the existing RLS-governed
// server client (never a service-role key). Zero writes: no
// INSERT/UPDATE/DELETE/UPSERT anywhere in this file. No migration was
// needed or created -- every column this module reads already exists on
// `public.contacts` exactly as designed by Phase 39.
//
// AMBIGUITY IS STRUCTURALLY IMPOSSIBLE: the read filters by `id`
// (primary key), so at most one row can ever match -- there is no
// "multiple destinations" case to resolve for a given contactId. A
// defensive `contactRecord.id !== contract.contactId` check still guards
// against a caller/test double supplying a mismatched pair.
//
// DESTINATION PII HANDLING: unlike the Phase 9 contract, the resolved
// envelope legitimately carries the raw destination (that is this
// boundary's entire purpose) -- but every failure reason string in this
// module is a fixed, generic, channel-only message (e.g. "EMAIL
// destination unavailable") and NEVER interpolates the destination value
// itself. The envelope is returned once, in memory, and this module
// never logs it, persists it, caches it, or writes it back anywhere.
//
// NO REFORMATTING: destination values are validated structurally
// (present, non-blank, within a sane shape) but never rewritten,
// trimmed-and-replaced, or country-code-normalised -- a malformed value
// fails closed rather than being "fixed."
//
// IDEMPOTENCY: `contract.idempotencyKey` (already the Phase 7 canonical
// value, sealed by Phase 9) is carried into the envelope completely
// unchanged -- never regenerated, trimmed, case-folded, or replaced, and
// no second idempotency store is implemented here.
//
// COMMERCIAL SEPARATION, STRUCTURAL: neither `ProviderNeutralDispatchContract`
// nor the minimal `contacts` read this module performs carries any
// opportunity-score/estimated-value/commission/renewal-attractiveness/
// lead-priority field -- there is nothing of that kind for this module to
// read, let alone be swayed by.

import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";
import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_TOKEN_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_TELEPHONE_LENGTH = 30;
const MIN_TELEPHONE_DIGITS = 10;
const EMAIL_SHAPE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_CHANNELS: ReadonlySet<ContactChannel> = new Set(["PHONE", "EMAIL", "WHATSAPP", "SMS"]);

/**
 * Identifies WHICH contact/channel a caller believes a destination
 * should be resolved for -- carries no authority of its own.
 * `contactId` is used STRICTLY as a cross-check against the sealed
 * `contract.contactId`, never as the database lookup key. See module
 * header.
 */
export type DestinationReference = {
  readonly contactId: number;
  readonly channel: ContactChannel;
};

/** The minimum columns this module ever reads from `public.contacts`. */
export type ContactDestinationRecord = {
  id: number;
  email: string | null;
  phone: string | null;
};

export type ResolveExecutionDestinationStatus = "destination_ready" | "blocked" | "evaluation_failed";

export type ResolveExecutionDestinationReason = { factor: string; detail: string };

/**
 * Contains ONLY what a future adapter genuinely needs: the same
 * authorizationRecordId/actionId/idempotencyKey/channel already sealed
 * into the Phase 9 contract, the contactId this destination was resolved
 * for, the resolved destination itself, and when it was resolved.
 * Deliberately excludes opportunity score, estimated value, commission,
 * revenue score, lead priority, renewal attractiveness, notes, evidence
 * blobs, and any other unrelated CRM data.
 */
export type ResolvedDestinationEnvelope = {
  readonly authorizationRecordId: number;
  readonly actionId: string;
  readonly idempotencyKey: string;
  readonly channel: ContactChannel;
  /** Sourced from contract.contactId (the sealed, authoritative provenance chain) -- never from destinationReference.contactId or any other caller input. */
  readonly contactId: number;
  readonly destination: string;
  readonly resolvedAt: string;
  /** Always the literal `false`. A resolved destination is not evidence anything was sent. */
  readonly executionPerformed: false;
};

export type ResolveExecutionDestinationResult = {
  status: ResolveExecutionDestinationStatus;
  envelope: ResolvedDestinationEnvelope | null;
  reasons: ResolveExecutionDestinationReason[];
  executionPerformed: false;
  evaluatedAt: string;
};

/** Same structural-usability rule as every prior phase in this chain: non-empty after trim, within a sane length bound. */
function isUsableToken(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TOKEN_LENGTH;
}

function isPositiveInteger(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Structural shape only -- never rewritten, never treated as evidence the mailbox exists. */
function isValidEmailShape(value: string): boolean {
  return value.length > 0 && value.length <= MAX_EMAIL_LENGTH && EMAIL_SHAPE_PATTERN.test(value);
}

/** Same digit-count discipline already established for telephone values elsewhere in this codebase (>=10 digits, not absurdly long) -- never reformatted or country-code-normalised. */
function isValidTelephoneShape(value: string): boolean {
  if (value.length === 0 || value.length > MAX_TELEPHONE_LENGTH) return false;
  const digitCount = value.replace(/[^0-9]/g, "").length;
  return digitCount >= MIN_TELEPHONE_DIGITS;
}

/**
 * Pure. Never performs I/O, never mutates `contract`, `destinationReference`,
 * or `contactRecord`, never itself throws. Every check below is
 * independent and fail-closed: the first failing condition determines the
 * result, and no later or otherwise-positive signal can undo an earlier
 * failure. `contactRecord: null` means "no read was attempted, or the
 * read found no matching row" -- both map to `blocked`, not
 * `evaluation_failed` (a definite fact, not an ambiguous failure); an
 * actual database read error is represented by the caller
 * (`resolveExecutionDestinationWithLookup`) returning `evaluation_failed`
 * directly, without ever calling this function.
 */
export function resolveExecutionDestination(
  contract: ProviderNeutralDispatchContract | null,
  destinationReference: DestinationReference | null,
  contactRecord: ContactDestinationRecord | null,
  evaluatedAt: Date,
): ResolveExecutionDestinationResult {
  const evaluatedAtIso = evaluatedAt.toISOString();
  const reasons: ResolveExecutionDestinationReason[] = [];

  function fail(status: "blocked" | "evaluation_failed", factor: string, detail: string): ResolveExecutionDestinationResult {
    reasons.push({ factor, detail });
    return {
      status,
      envelope: null,
      reasons,
      executionPerformed: false,
      evaluatedAt: evaluatedAtIso,
    };
  }

  if (!contract) {
    return fail("blocked", "Contract", "No Phase 9 provider-neutral dispatch contract was supplied.");
  }

  if (contract.executionPerformed !== false) {
    return fail("evaluation_failed", "Execution flag", "contract.executionPerformed was not literally false -- refusing to trust an internally inconsistent contract.");
  }

  if (!isPositiveInteger(contract.authorizationRecordId)) {
    return fail("blocked", "Authorization record", "contract.authorizationRecordId is missing or not a positive integer.");
  }
  if (!isUsableToken(contract.actionId)) {
    return fail("blocked", "Action identity", "contract.actionId is missing, blank, or exceeds the usable length bound.");
  }
  if (!isUsableToken(contract.idempotencyKey)) {
    return fail("blocked", "Idempotency", "contract.idempotencyKey is missing, blank, or exceeds the usable length bound.");
  }
  if (!isPositiveInteger(contract.contactId)) {
    return fail("blocked", "Contact identity", "contract.contactId is missing or not a positive integer.");
  }
  if (!VALID_CHANNELS.has(contract.channel)) {
    return fail("blocked", "Channel", `contract.channel '${String(contract.channel)}' is not a recognised dispatch channel.`);
  }

  if (!destinationReference) {
    return fail("blocked", "Destination reference", "No destination reference was supplied.");
  }
  if (!isPositiveInteger(destinationReference.contactId)) {
    return fail("blocked", "Destination reference", "destinationReference.contactId is missing or not a positive integer.");
  }
  if (!VALID_CHANNELS.has(destinationReference.channel)) {
    return fail("blocked", "Destination reference", `destinationReference.channel '${String(destinationReference.channel)}' is not a recognised dispatch channel.`);
  }

  if (destinationReference.channel !== contract.channel) {
    return fail(
      "blocked",
      "Channel consistency",
      `destinationReference.channel '${destinationReference.channel}' does not match contract.channel '${contract.channel}' -- no fallback or cross-channel routing is permitted.`,
    );
  }

  // Contact-id provenance (hardened): destinationReference.contactId is
  // strictly a cross-check against the sealed, authoritative
  // contract.contactId -- never a source of truth. A mismatch here means
  // the caller supplied a reference for a DIFFERENT contact than the one
  // this authorization was ever sealed for; the database lookup itself
  // (in resolveExecutionDestinationWithLookup) is never even keyed on
  // destinationReference.contactId, so a substituted contactId cannot
  // cause a lookup for that other contact regardless of what happens here.
  if (destinationReference.contactId !== contract.contactId) {
    return fail(
      "blocked",
      "Contact identity",
      "destinationReference.contactId does not match contract.contactId -- refusing to resolve a destination for a different contact than the one this authorization was sealed for.",
    );
  }

  if (!contactRecord) {
    return fail("blocked", "Contact record", "No contact record was found for this destination reference.");
  }
  if (contactRecord.id !== contract.contactId) {
    return fail("blocked", "Contact record", "The fetched contact record does not match contract.contactId -- refusing to trust a mismatched pair.");
  }

  const channel = contract.channel;
  const rawDestination = channel === "EMAIL" ? contactRecord.email : contactRecord.phone;

  if (rawDestination == null) {
    return fail("blocked", "Destination", `${channel} destination unavailable.`);
  }
  const trimmedDestination = rawDestination.trim();
  if (trimmedDestination.length === 0) {
    return fail("blocked", "Destination", `${channel} destination unavailable.`);
  }

  const isValidShape = channel === "EMAIL" ? isValidEmailShape(trimmedDestination) : isValidTelephoneShape(trimmedDestination);
  if (!isValidShape) {
    return fail("blocked", "Destination", `${channel} destination is not structurally valid.`);
  }

  reasons.push({
    factor: "Overall",
    detail: `${channel} destination resolved for contactId ${contract.contactId} -- no execution performed.`,
  });

  const envelope: ResolvedDestinationEnvelope = Object.freeze({
    authorizationRecordId: contract.authorizationRecordId,
    actionId: contract.actionId,
    idempotencyKey: contract.idempotencyKey,
    channel,
    // Sourced from contract.contactId (the sealed, authoritative
    // provenance chain), NOT from destinationReference.contactId. See
    // module header.
    contactId: contract.contactId,
    destination: trimmedDestination,
    resolvedAt: evaluatedAtIso,
    executionPerformed: false,
  });

  return {
    status: "destination_ready",
    envelope,
    reasons,
    executionPerformed: false,
    evaluatedAt: evaluatedAtIso,
  };
}

/**
 * The only function in this module that performs I/O: at most one
 * read-only SELECT against `public.contacts`, filtered by primary key,
 * selecting only `id, email, phone`. No INSERT/UPDATE/DELETE/UPSERT
 * anywhere. A read error resolves to `evaluation_failed` directly --
 * this function never calls `resolveExecutionDestination()` with a
 * guessed record when the read itself failed.
 *
 * CONTACT-ID PROVENANCE (hardened): the read is ALWAYS keyed on
 * `contract.contactId` -- the sealed, authoritative value -- NEVER on
 * `destinationReference.contactId`. If `contract`/`contract.contactId`
 * is missing or structurally invalid, or `destinationReference` is
 * missing/invalid, or `destinationReference.contactId` does not exactly
 * equal `contract.contactId`, no read is even attempted -- the pure
 * function is called directly with `contactRecord: null` so it can
 * report the precise structural reason. This means a caller supplying a
 * `destinationReference` for a different contact can never cause a
 * database lookup for that other contact, let alone resolve their
 * destination.
 */
export async function resolveExecutionDestinationWithLookup(
  supabase: SupabaseServerClient,
  contract: ProviderNeutralDispatchContract | null,
  destinationReference: DestinationReference | null,
  evaluatedAt: Date,
): Promise<ResolveExecutionDestinationResult> {
  const provenanceProven =
    contract != null &&
    isPositiveInteger(contract.contactId) &&
    destinationReference != null &&
    isPositiveInteger(destinationReference.contactId) &&
    destinationReference.contactId === contract.contactId;

  if (!provenanceProven) {
    return resolveExecutionDestination(contract, destinationReference, null, evaluatedAt);
  }

  const { data, error } = await supabase
    .from("contacts")
    .select("id, email, phone")
    // Authoritative key: contract.contactId, proven above to equal
    // destinationReference.contactId -- never an independently
    // caller-selected identifier. See module header.
    .eq("id", contract.contactId)
    .maybeSingle();

  if (error) {
    return {
      status: "evaluation_failed",
      envelope: null,
      reasons: [{ factor: "Database read", detail: "Failed to load the contact record for destination resolution." }],
      executionPerformed: false,
      evaluatedAt: evaluatedAt.toISOString(),
    };
  }

  return resolveExecutionDestination(contract, destinationReference, data as ContactDestinationRecord | null, evaluatedAt);
}
