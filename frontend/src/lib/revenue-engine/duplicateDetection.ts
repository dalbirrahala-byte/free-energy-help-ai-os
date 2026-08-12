// Factory 025A: advisory-only possible-duplicate detection.
//
// Pure — no I/O, no AI, no fabricated confidence score. Matches this lead
// against other leads already in the table by normalised email or
// telephone. This never rejects, merges, updates, or deletes anything —
// it only returns a list for a human to review on the lead detail page,
// exactly the same "advisory, never automated" contract already used by
// prioritization.ts / routingRecommendation.ts (Factory 023/024).
//
// Discovery found no existing dedup logic anywhere and no unique
// constraint on leads.email/telephone (see Factory 025A discovery
// report) — this closes that observability gap without touching the
// database, ingest_public_lead, or any RLS policy.

import type { CanonicalLead } from "../shared/domain";
import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type DuplicateCandidateRow = {
  id: number;
  company_name: string | null;
  email: string | null;
  telephone: string | null;
  created_at: string;
};

export type DuplicateMatchField = "email" | "telephone";

export type PotentialDuplicateMatch = {
  id: number;
  companyName: string | null;
  matchedOn: DuplicateMatchField[];
  createdAt: string;
};

/** Lower-cased, trimmed; empty/whitespace-only treated as absent, same as the rest of this codebase's nullable-string handling. */
function normaliseEmail(email: string | null): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/**
 * Digits only, minimum 10 — mirrors the digit-count rule
 * public.ingest_public_lead() already enforces at insert time
 * (supabase/migrations/20260812110000_ingest_public_lead_function.sql),
 * so a candidate that wouldn't have passed ingestion validation can never
 * produce a phone match here either.
 */
function normalisePhone(telephone: string | null): string | null {
  const digits = telephone?.replace(/\D/g, "");
  return digits && digits.length >= 10 ? digits : null;
}

/**
 * Compares one lead against a candidate set (typically "every other lead
 * in the table") and reports which, if any, share a normalised email or
 * telephone. The current lead's own id is always excluded by the caller
 * supplying `candidates` (the loader below filters it out at the query),
 * but this function also defensively skips a candidate whose id matches
 * the current lead, so it's safe to call even if a caller forgets to.
 */
export function findPotentialDuplicateLeads(
  currentLead: Pick<CanonicalLead, "id" | "email" | "telephone">,
  candidates: DuplicateCandidateRow[],
): PotentialDuplicateMatch[] {
  const currentEmail = normaliseEmail(currentLead.email);
  const currentPhone = normalisePhone(currentLead.telephone);

  if (!currentEmail && !currentPhone) {
    return [];
  }

  const matches: PotentialDuplicateMatch[] = [];

  for (const candidate of candidates) {
    if (candidate.id === currentLead.id) {
      continue;
    }

    const matchedOn: DuplicateMatchField[] = [];
    const candidateEmail = normaliseEmail(candidate.email);
    const candidatePhone = normalisePhone(candidate.telephone);

    if (currentEmail && candidateEmail && currentEmail === candidateEmail) {
      matchedOn.push("email");
    }
    if (currentPhone && candidatePhone && currentPhone === candidatePhone) {
      matchedOn.push("telephone");
    }

    if (matchedOn.length > 0) {
      matches.push({
        id: candidate.id,
        companyName: candidate.company_name,
        matchedOn,
        createdAt: candidate.created_at,
      });
    }
  }

  return matches.sort((a, b) => a.id - b.id);
}

/**
 * Fetches the minimum columns needed (no notes/status/source — this is a
 * duplicate check, not a second lead view) using the caller's already-
 * authenticated server client, under the same `leads_select_authenticated`
 * RLS policy that already governs the rest of the lead detail page. No new
 * query privilege, no service-role key, no new grant.
 *
 * Degrades gracefully: a failed query returns no matches rather than
 * throwing, since a possible-duplicate hint is advisory, not load-bearing.
 */
export async function loadPotentialDuplicateLeads(
  supabase: SupabaseServerClient,
  currentLead: Pick<CanonicalLead, "id" | "email" | "telephone">,
): Promise<PotentialDuplicateMatch[]> {
  if (!currentLead.email && !currentLead.telephone) {
    return [];
  }

  const { data } = await supabase
    .from("leads")
    .select("id, company_name, email, telephone, created_at")
    .neq("id", currentLead.id);

  return findPotentialDuplicateLeads(currentLead, (data ?? []) as DuplicateCandidateRow[]);
}
