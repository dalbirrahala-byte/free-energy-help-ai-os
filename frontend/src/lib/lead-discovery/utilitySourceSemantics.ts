/**
 * Utility Intent Radar source semantics v3.
 *
 * This module is intentionally side-effect free and grants no provider, CRM,
 * outreach or network capability. It exists to prevent generic public-web
 * evidence from being mislabeled as OnlineDIRECT provider intelligence.
 *
 * Integration note: intentRadar.ts still needs PUBLIC_WEB_SIGNAL added to the
 * canonical source enum before utilityIntentRadar.ts can import this module.
 */

export const UTILITY_SOURCE_SEMANTICS = Object.freeze({
  COMPANIES_HOUSE: Object.freeze({
    source: "COMPANIES_HOUSE",
    provenance: "PUBLIC_OFFICIAL",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  PLANNING_DATA: Object.freeze({
    source: "PLANNING",
    provenance: "PUBLIC_OFFICIAL",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  LOCAL_AUTHORITY_PLANNING: Object.freeze({
    source: "PLANNING",
    provenance: "PUBLIC_OFFICIAL",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  CONTRACTS_FINDER: Object.freeze({
    source: "TENDER_CONTRACT",
    provenance: "PUBLIC_OFFICIAL",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  FIND_A_TENDER: Object.freeze({
    source: "TENDER_CONTRACT",
    provenance: "PUBLIC_OFFICIAL",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  COMPANY_NEWSROOM: Object.freeze({
    source: "PUBLIC_WEB_SIGNAL",
    provenance: "PUBLIC_WEB",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  COMMERCIAL_PROPERTY: Object.freeze({
    source: "PUBLIC_WEB_SIGNAL",
    provenance: "PUBLIC_WEB",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  TRADE_LOCAL_PRESS: Object.freeze({
    source: "PUBLIC_WEB_SIGNAL",
    provenance: "PUBLIC_WEB",
    providerAuthority: false,
    apolloTriggerAuthority: false,
  }),
  ONLINE_DIRECT: Object.freeze({
    source: "ONLINE_DIRECT",
    provenance: "PROVIDER_ENRICHMENT",
    providerAuthority: true,
    apolloTriggerAuthority: false,
  }),
} as const);

export type UtilitySourceAdapterName = keyof typeof UTILITY_SOURCE_SEMANTICS;

export function getUtilitySourceSemantics(name: unknown) {
  if (typeof name !== "string" || !Object.hasOwn(UTILITY_SOURCE_SEMANTICS, name)) {
    throw new Error("unknown_utility_source_adapter");
  }
  return UTILITY_SOURCE_SEMANTICS[name as UtilitySourceAdapterName];
}

/**
 * Public-web observations are research evidence only. They may support a human
 * review but must not independently authorise provider enrichment or outreach.
 */
export function isPublicWebResearchOnly(name: unknown): boolean {
  const semantics = getUtilitySourceSemantics(name);
  return semantics.source === "PUBLIC_WEB_SIGNAL";
}
