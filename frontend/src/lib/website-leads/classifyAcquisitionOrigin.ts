// Factory 025B: deterministic, analytics-only acquisition-origin
// classification for the public business-energy-quote landing page.
//
// Pure — no I/O, no external calls, no randomness. Takes only the inbound
// page-load request's Referer (and, for self-referral detection, Host)
// header value, already read server-side by the caller, and returns a
// small, fixed category. This is a fallback signal only: an explicit
// utm_source query parameter always wins over this classification (see
// business-energy-quote/actions.ts) — the existing precedence there is
// unchanged by this file.
//
// TRUST BOUNDARY: the Referer header is browser-derived and untrusted — a
// script can omit or rewrite it, and privacy-respecting browsers strip it
// entirely (which presents as "direct" even when it wasn't). This output
// is for analytics/attribution ONLY and must never be used for
// authentication, authorisation, RLS, or any security decision.
//
// PRIVACY: only the referrer's hostname is inspected — its path and query
// string (which can carry a typed search query) are never extracted or
// stored. Only the resulting category label is returned by this module;
// callers should persist that label, not the raw referrer.

export type AcquisitionOrigin =
  | "direct"
  | "organic_search"
  | "ai_search"
  | "organic_social"
  | "referral"
  | "unknown";

export const ACQUISITION_ORIGINS: readonly AcquisitionOrigin[] = [
  "direct",
  "organic_search",
  "ai_search",
  "organic_social",
  "referral",
  "unknown",
];

export function isAcquisitionOrigin(value: string): value is AcquisitionOrigin {
  return (ACQUISITION_ORIGINS as readonly string[]).includes(value);
}

export type ClassifyAcquisitionOriginInput = {
  /** Raw Referer header value from the inbound page-load request, or null if absent. */
  referrer: string | null;
  /** This site's own hostname (e.g. from the inbound request's Host header), so an internal/self-referral is treated as direct rather than a distinct external origin. */
  siteHostname?: string | null;
};

export type ClassifyAcquisitionOriginResult = {
  origin: AcquisitionOrigin;
  /** The parsed referrer hostname, if any — for optional future enrichment. Not persisted by default. */
  matchedHostname: string | null;
};

/**
 * Deliberately small, explicit allowlists — extend by adding a hostname
 * here, never by changing the classification logic below. Google's
 * country-code TLDs are listed individually rather than matched with a
 * prefix/regex heuristic, so a hostile domain crafted to merely start
 * with "google." can never be misclassified as organic search.
 */
const SEARCH_ENGINE_HOSTNAMES = new Set([
  "google.com",
  "google.co.uk",
  "google.ie",
  "google.de",
  "google.fr",
  "google.ca",
  "google.com.au",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "search.brave.com",
]);

/**
 * bing.com is intentionally NOT included here — a bare bing.com referrer
 * cannot reliably distinguish ordinary Bing search from Bing Copilot, so
 * it stays classified as organic_search rather than overstating
 * certainty. Copilot's own referrals arrive via copilot.microsoft.com.
 */
const AI_SEARCH_HOSTNAMES = new Set([
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "claude.ai",
  "you.com",
]);

const SOCIAL_HOSTNAMES = new Set([
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "threads.net",
]);

function normaliseHostname(hostname: string): string {
  const lower = hostname.trim().toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

/** Never throws — a malformed referrer is reported as unparseable, not an error. */
function parseReferrerHostname(referrer: string): string | null {
  try {
    return normaliseHostname(new URL(referrer).hostname);
  } catch {
    return null;
  }
}

export function classifyAcquisitionOrigin(
  input: ClassifyAcquisitionOriginInput,
): ClassifyAcquisitionOriginResult {
  const { referrer, siteHostname } = input;

  if (!referrer || !referrer.trim()) {
    return { origin: "direct", matchedHostname: null };
  }

  const hostname = parseReferrerHostname(referrer);

  if (!hostname) {
    return { origin: "unknown", matchedHostname: null };
  }

  if (siteHostname && hostname === normaliseHostname(siteHostname)) {
    return { origin: "direct", matchedHostname: hostname };
  }

  if (AI_SEARCH_HOSTNAMES.has(hostname)) {
    return { origin: "ai_search", matchedHostname: hostname };
  }

  if (SEARCH_ENGINE_HOSTNAMES.has(hostname)) {
    return { origin: "organic_search", matchedHostname: hostname };
  }

  if (SOCIAL_HOSTNAMES.has(hostname)) {
    return { origin: "organic_social", matchedHostname: hostname };
  }

  return { origin: "referral", matchedHostname: hostname };
}
