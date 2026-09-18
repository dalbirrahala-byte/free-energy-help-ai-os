export type BusinessEnergyMarketSignalId =
  | "broker_trust"
  | "contract_authority"
  | "renewal_price_check"
  | "complex_supply"
  | "contact_preference"
  | "green_claims"
  | "multi_site";

export type BusinessEnergyMarketSignalSeverity = "critical" | "warning" | "info";

export type BusinessEnergyMarketSignal = {
  id: BusinessEnergyMarketSignalId;
  label: string;
  severity: BusinessEnergyMarketSignalSeverity;
  matchedTerms: string[];
  crmPrompt: string;
  revenueAction: string;
  socialTheme: string;
};

type SignalDefinition = Omit<BusinessEnergyMarketSignal, "matchedTerms"> & {
  terms: readonly string[];
};

/**
 * Manual UK small-business energy research taxonomy.
 *
 * Source: FEH manual Reddit research completed 18 Sep 2026.
 * This is not a live Reddit feed, not an AI model, and not external enrichment.
 * It is a deterministic vocabulary layer that helps the CRM notice language
 * already present in a lead's own notes/source detail.
 */
const SIGNAL_DEFINITIONS: readonly SignalDefinition[] = [
  {
    id: "broker_trust",
    label: "Broker trust / transparency concern",
    severity: "warning",
    terms: ["scam", "hidden commission", "middleman", "pressure tactics", "broker lies", "broker lied", "broker trust"],
    crmPrompt: "Record the concern clearly and explain FEH's role, value and remuneration before asking for commitment.",
    revenueAction: "Use a transparent comparison and explain what FEH will and will not do before progressing.",
    socialTheme: "What a trustworthy business-energy broker should explain before you sign.",
  },
  {
    id: "contract_authority",
    label: "Contract authority / lock-in concern",
    severity: "warning",
    terms: ["letter of authority", "loa", "future contracts", "auto renew", "auto-renew", "locked into", "authority to agree"],
    crmPrompt: "Confirm exactly what authority has been granted, the contract term, renewal mechanics and any exit implications.",
    revenueAction: "Review authority and contract position before any pricing or supplier action.",
    socialTheme: "Know exactly what authority you are giving an energy broker.",
  },
  {
    id: "renewal_price_check",
    label: "Renewal / price competitiveness",
    severity: "info",
    terms: ["renewal", "renewing", "contract ending", "contract end", "competitive", "unit rate", "standing charge", "quote"],
    crmPrompt: "Capture current supplier, contract end date, quote structure and the customer's comparison question.",
    revenueAction: "Prepare a whole-cost comparison rather than relying on headline p/kWh alone.",
    socialTheme: "How to tell whether a business-energy quote is actually competitive.",
  },
  {
    id: "complex_supply",
    label: "Complex electricity supply",
    severity: "info",
    terms: ["half hourly", "half-hourly", "hh meter", "three phase", "3 phase", "kva", "availability charge", "capacity charge"],
    crmPrompt: "Capture only the commercially relevant supply facts needed for pricing: HH status, usage pattern, kVA/capacity and material charges.",
    revenueAction: "Collect the minimum pricing data before comparison; do not reopen a broad metering project.",
    socialTheme: "What an HH business needs before comparing electricity prices.",
  },
  {
    id: "contact_preference",
    label: "Unwanted contact / no-pressure preference",
    severity: "critical",
    terms: ["cold call", "cold calling", "do not call", "don't call", "no calls", "bombarded", "barrage of calls", "spam calls"],
    crmPrompt: "Treat this as a contact-preference warning. Record and respect the customer's stated channel and frequency preference.",
    revenueAction: "Do not auto-contact. Use permission-based follow-up only and keep the source/provenance auditable.",
    socialTheme: "A business-energy health check without triggering a barrage of sales calls.",
  },
  {
    id: "green_claims",
    label: "Green tariff / carbon credibility",
    severity: "info",
    terms: ["green tariff", "renewable", "rego", "carbon reporting", "carbon footprint", "solar", "ppa"],
    crmPrompt: "Capture whether the customer needs renewable evidence, carbon reporting support or simply a green tariff comparison.",
    revenueAction: "Separate procurement need from sustainability evidence before recommending a next step.",
    socialTheme: "What 'green' business-energy claims actually need checking.",
  },
  {
    id: "multi_site",
    label: "Multi-site complexity",
    severity: "info",
    terms: ["multi-site", "multi site", "multiple sites", "couple of sites", "several sites"],
    crmPrompt: "Capture site count and whether renewal dates, suppliers or tariffs differ by site.",
    revenueAction: "Assess whether sites should be compared individually or coordinated as one renewal programme.",
    socialTheme: "Why multi-site businesses need more than a single headline energy rate.",
  },
];

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function classifyBusinessEnergyMarketSignals(
  ...inputs: Array<string | null | undefined>
): BusinessEnergyMarketSignal[] {
  const haystack = normalise(inputs.filter(Boolean).join(" "));
  if (!haystack) {
    return [];
  }

  return SIGNAL_DEFINITIONS.flatMap((definition) => {
    const matchedTerms = definition.terms.filter((term) => haystack.includes(normalise(term)));
    if (matchedTerms.length === 0) {
      return [];
    }

    const { terms: _terms, ...signal } = definition;
    return [{ ...signal, matchedTerms }];
  });
}

export function getBusinessEnergyMarketSignalDefinitions(): readonly SignalDefinition[] {
  return SIGNAL_DEFINITIONS;
}
