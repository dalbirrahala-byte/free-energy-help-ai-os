export const FACTORY_044_SIGNAL_FAMILIES = [
  "BUSINESS_CHANGE",
  "PROPERTY_DEVELOPMENT",
  "ENERGY_DEMAND",
  "PROCUREMENT",
  "PAIN_SERVICE",
  "COMMERCIAL_INTELLIGENCE",
  "RENEWABLE_DECARBONISATION",
  "METERING_INFRASTRUCTURE",
  "CUSTOMER_RENEWAL",
  "DIGITAL_INTENT",
] as const;

export type Factory044SignalFamily = (typeof FACTORY_044_SIGNAL_FAMILIES)[number];

export type DiscoveryRequest = Readonly<{
  businessName?: string | null;
  sector?: string | null;
  locations: readonly string[];
  signalFamilies: readonly Factory044SignalFamily[];
}>;

export type PlannedDiscoveryQuery = Readonly<{
  query: string;
  signalFamily: Factory044SignalFamily;
  technique: string;
}>;

export type PublicWebEvidence = Readonly<{
  candidateName: string;
  candidateDomain?: string | null;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt?: string | null;
  observedAt: string;
  signalFamily: Factory044SignalFamily;
  signalType: string;
  sourceVerified: boolean;
  aiInferred: boolean;
  confidence: number | null;
  provenance: "PUBLIC";
}>;

export type OpportunityEvaluation = Readonly<{
  classification: "HOT" | "WARM" | "NURTURE" | "INSUFFICIENT_EVIDENCE";
  score: number;
  reasons: readonly string[];
  promotionAllowed: false;
}>;

const SIGNAL_TERMS: Readonly<Record<Factory044SignalFamily, readonly string[]>> = {
  BUSINESS_CHANGE: ["expansion", "new site", "acquisition"],
  PROPERTY_DEVELOPMENT: ["planning application", "new warehouse", "new premises"],
  ENERGY_DEMAND: ["new machinery", "production expansion", "high energy use"],
  PROCUREMENT: ["energy tender", "procurement", "contract renewal"],
  PAIN_SERVICE: ["energy costs", "supplier issue", "billing issue"],
  COMMERCIAL_INTELLIGENCE: ["growth", "investment", "recruitment"],
  RENEWABLE_DECARBONISATION: ["solar", "net zero", "decarbonisation"],
  METERING_INFRASTRUCTURE: ["metering", "half hourly", "smart meter"],
  CUSTOMER_RENEWAL: ["energy renewal", "contract end", "supplier renewal"],
  DIGITAL_INTENT: ["business energy", "energy quote", "energy broker"],
};

function cleanTerm(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 120) : null;
}

function quoted(value: string): string {
  return `"${value.replace(/"/g, "")}“`.replace(/“$/, '"');
}

export function buildDiscoveryQueries(request: DiscoveryRequest): readonly PlannedDiscoveryQuery[] {
  const businessName = cleanTerm(request.businessName);
  const sector = cleanTerm(request.sector);
  const locations = [...new Set(request.locations.map(cleanTerm).filter((value): value is string => Boolean(value)))].sort();
  const families = [...new Set(request.signalFamilies)].sort();

  if (!businessName && !sector) return [];
  if (families.length === 0) return [];

  const planned: PlannedDiscoveryQuery[] = [];
  for (const family of families) {
    for (const signalTerm of SIGNAL_TERMS[family]) {
      const anchors = businessName ? [quoted(businessName)] : [quoted(sector!)];
      const locationTerms = locations.length > 0 ? locations : [null];
      for (const location of locationTerms) {
        planned.push({
          query: [anchors[0], quoted(signalTerm), location ? quoted(location) : null].filter(Boolean).join(" "),
          signalFamily: family,
          technique: businessName ? "named-business-signal" : "sector-location-signal",
        });
      }
    }
  }

  return planned;
}

export function buildPublicWebEvidence(input: PublicWebEvidence): PublicWebEvidence {
  const candidateName = cleanTerm(input.candidateName);
  const title = cleanTerm(input.sourceTitle);
  const signalType = cleanTerm(input.signalType);
  if (!candidateName || !title || !signalType) throw new Error("invalid_evidence_text");

  let url: URL;
  try {
    url = new URL(input.sourceUrl);
  } catch {
    throw new Error("invalid_source_url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid_source_url");

  const observed = new Date(input.observedAt);
  if (Number.isNaN(observed.getTime())) throw new Error("invalid_observed_at");
  if (input.confidence !== null && (!Number.isInteger(input.confidence) || input.confidence < 0 || input.confidence > 100)) {
    throw new Error("invalid_confidence");
  }
  if (input.aiInferred && input.sourceVerified) throw new Error("inference_cannot_be_source_verified");

  return {
    ...input,
    candidateName,
    candidateDomain: cleanTerm(input.candidateDomain),
    sourceUrl: url.toString(),
    sourceTitle: title,
    sourceExcerpt: cleanTerm(input.sourceExcerpt)?.slice(0, 2000) ?? null,
    signalType,
    provenance: "PUBLIC",
  };
}

export function evaluateOpportunityEvidence(evidence: readonly PublicWebEvidence[]): OpportunityEvaluation {
  if (evidence.length === 0) {
    return { classification: "INSUFFICIENT_EVIDENCE", score: 0, reasons: ["No public-web evidence supplied."], promotionAllowed: false };
  }

  const uniqueSources = new Set(evidence.map((item) => new URL(item.sourceUrl).hostname.toLowerCase())).size;
  const verifiedCount = evidence.filter((item) => item.sourceVerified).length;
  const confidenceValues = evidence.map((item) => item.confidence).filter((value): value is number => value !== null);
  const averageConfidence = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length)
    : 0;

  const familyWeight = Math.min(new Set(evidence.map((item) => item.signalFamily)).size * 8, 24);
  const sourceWeight = Math.min(uniqueSources * 10, 30);
  const verificationWeight = Math.min(verifiedCount * 10, 20);
  const confidenceWeight = Math.round(averageConfidence * 0.26);
  const score = Math.min(100, familyWeight + sourceWeight + verificationWeight + confidenceWeight);

  const reasons = [
    `${uniqueSources} independent source domain(s).`,
    `${new Set(evidence.map((item) => item.signalFamily)).size} signal family/families.`,
    `${verifiedCount} source-verified observation(s).`,
    `Average stated confidence ${averageConfidence}.`,
    "Discovery evidence never grants contact permission or automatic CRM promotion.",
  ];

  const classification = score >= 70 ? "HOT" : score >= 45 ? "WARM" : score >= 20 ? "NURTURE" : "INSUFFICIENT_EVIDENCE";
  return { classification, score, reasons, promotionAllowed: false };
}
