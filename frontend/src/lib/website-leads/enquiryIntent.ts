/**
 * FEH website lead intent: a pure, allowlisted classifier for review-only
 * landing-page construction. No database, messaging, consent or provider access.
 *
 * Trust boundary:
 * - `serverRoute` must come from the FIRST-PARTY SERVER ROUTE, not a submitted
 *   field, referrer, UTM or campaign ID. It is page context, NOT a customer's
 *   declared need.
 * - `visitorSelection` is untrusted input; only exact known strings may be
 *   treated as a declared enquiry category. Invalid supplied values fail to
 *   `general` rather than inheriting the page's category.
 * - Channel attribution is separate from the customer's requested help.
 *
 * This module is NOT integrated with live CRM ingestion. Implement the
 * server-side ingestion/consent/review gate before enabling new form routes.
 */

export const ENQUIRY_INTENTS = [
  "renewal",
  "change_of_tenancy",
  "billing_issue",
  "general",
] as const;

export type EnquiryIntent = (typeof ENQUIRY_INTENTS)[number];

export type EnquiryIntentEvidence =
  | "customer_selection"
  | "first_party_page_context"
  | "unknown";

export type ResolvedEnquiryIntent = Readonly<{
  intent: EnquiryIntent;
  evidence: EnquiryIntentEvidence;
  /** Fixed known first-party page route only; no raw UTM or referrer stored. */
  landingRoute: string | null;
}>;

const INTENT_BY_ROUTE: Readonly<Record<string, Exclude<EnquiryIntent, "general">>> = {
  "/business-energy-renewal": "renewal",
  "/business-energy-change-of-tenancy": "change_of_tenancy",
  "/business-energy-bill-help": "billing_issue",
};

function knownLandingRoute(serverRoute: unknown): string | null {
  if (typeof serverRoute !== "string") return null;
  // A trailing slash is fine; a query, fragment, look-alike, untrusted full
  // URL, or arbitrary path is not evidence of a known FEH landing page.
  const route = serverRoute.endsWith("/") ? serverRoute.slice(0, -1) : serverRoute;
  return Object.prototype.hasOwnProperty.call(INTENT_BY_ROUTE, route) ? route : null;
}

export function isEnquiryIntent(value: unknown): value is EnquiryIntent {
  return typeof value === "string" &&
    (ENQUIRY_INTENTS as readonly string[]).includes(value);
}

export function resolveEnquiryIntent(input: Readonly<{
  /** Server-chosen route, not caller-provided URL or submitted field. */
  serverRoute: unknown;
  /** Value explicitly selected by the visitor, if supplied. */
  visitorSelection?: unknown;
}>): ResolvedEnquiryIntent {
  const route = knownLandingRoute(input.serverRoute);

  // Treat null or undefined as no customer selection; FormData.get returns
  // null for an absent field. A supplied invalid string/array is not trusted.
  if (input.visitorSelection != null) {
    if (isEnquiryIntent(input.visitorSelection)) {
      return {
        intent: input.visitorSelection,
        evidence: "customer_selection",
        landingRoute: route,
      };
    }
    return { intent: "general", evidence: "unknown", landingRoute: route };
  }

  if (route) {
    return {
      intent: INTENT_BY_ROUTE[route],
      evidence: "first_party_page_context",
      landingRoute: route,
    };
  }
  return { intent: "general", evidence: "unknown", landingRoute: null };
}
