import { calculateRenewalIntelligence } from "../renewal-intelligence/index.ts";
import { buildIntentRadarSignal, type IntentRadarSignal, type IntentRadarSignalStrength } from "./intentRadar.ts";

export type ContractExpiryCompany = Readonly<{
  companyName: string;
  companyNumber?: string | null;
  companyDomain?: string | null;
  contractEnd: string | null;
  contractReference: string;
}>;

export type PublicTenderObservation = Readonly<{
  companyName: string;
  companyNumber?: string | null;
  companyDomain?: string | null;
  tenderReference: string;
  sourceUrl: string;
  publishedAt: string;
  closesAt: string;
  title: string;
  exactOrganisationMatch: boolean;
  sourceOfficial: boolean;
}>;

function clean(value: string | null | undefined, max = 500): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function dateOnlyFromInstant(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function strengthForUrgency(tier: ReturnType<typeof calculateRenewalIntelligence>["urgency"]["tier"]): IntentRadarSignalStrength {
  if (tier === "Critical" || tier === "Urgent") return "STRONG";
  if (tier === "Approaching") return "MEDIUM";
  return "WEAK";
}

export function mapContractExpiryToIntentSignal(
  company: ContractExpiryCompany,
  asOf: Date,
): IntentRadarSignal | null {
  const contractReference = clean(company.contractReference, 180);
  if (!contractReference) throw new Error("invalid_contract_reference");

  const renewal = calculateRenewalIntelligence({ contract_end: company.contractEnd }, asOf);
  const days = renewal.daysRemaining.days;
  if (days === null || days < 0 || renewal.urgency.tier === "Future") return null;

  const strength = strengthForUrgency(renewal.urgency.tier);
  const confidence = strength === "STRONG" ? 95 : strength === "MEDIUM" ? 90 : 80;
  const observedAt = new Date(asOf);
  if (Number.isNaN(observedAt.getTime())) throw new Error("invalid_as_of");

  return buildIntentRadarSignal({
    companyName: company.companyName,
    companyNumber: company.companyNumber ?? null,
    companyDomain: company.companyDomain ?? null,
    source: "TENDER_CONTRACT",
    sourceReference: `contract:${contractReference}:${company.contractEnd}`,
    sourceUrl: null,
    observedAt: observedAt.toISOString(),
    expiresAt: company.contractEnd ? `${company.contractEnd}T23:59:59.999Z` : null,
    signalFamily: "CUSTOMER_RENEWAL",
    signalType: `CONTRACT_EXPIRY_${renewal.urgency.tier.toUpperCase()}`,
    summary: `${renewal.procurementStatus.value}. ${renewal.daysRemaining.value} remain against the contract end date held by FEH.`,
    evidenceBasis: "VERIFIED_FACT",
    sourceVerified: true,
    confidence,
    strength,
    provenance: "FIRST_PARTY",
  });
}

export function mapPublicTenderToIntentSignal(
  tender: PublicTenderObservation,
  asOf: Date,
): IntentRadarSignal | null {
  const tenderReference = clean(tender.tenderReference, 180);
  const title = clean(tender.title, 500);
  if (!tenderReference || !title) throw new Error("invalid_tender_metadata");

  const publishedAt = new Date(tender.publishedAt);
  const closesAt = new Date(tender.closesAt);
  const now = new Date(asOf);
  if ([publishedAt, closesAt, now].some((date) => Number.isNaN(date.getTime()))) throw new Error("invalid_tender_date");
  if (closesAt.getTime() <= publishedAt.getTime()) throw new Error("invalid_tender_window");
  if (closesAt.getTime() <= now.getTime()) return null;

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(tender.sourceUrl);
  } catch {
    throw new Error("invalid_tender_source_url");
  }
  if (sourceUrl.protocol !== "https:" && sourceUrl.protocol !== "http:") throw new Error("invalid_tender_source_url");

  const verifiedCompanyAssociation = tender.sourceOfficial && tender.exactOrganisationMatch;
  const daysToClose = Math.ceil((closesAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const strength: IntentRadarSignalStrength = verifiedCompanyAssociation && daysToClose <= 90 ? "STRONG" : "MEDIUM";

  return buildIntentRadarSignal({
    companyName: tender.companyName,
    companyNumber: tender.companyNumber ?? null,
    companyDomain: tender.companyDomain ?? null,
    source: "TENDER_CONTRACT",
    sourceReference: `tender:${tenderReference}`,
    sourceUrl: sourceUrl.toString(),
    observedAt: publishedAt.toISOString(),
    expiresAt: closesAt.toISOString(),
    signalFamily: "PROCUREMENT",
    signalType: "PUBLIC_TENDER_OPEN",
    summary: `Public tender ${tenderReference}: ${title}; closes ${dateOnlyFromInstant(closesAt)}.`,
    evidenceBasis: verifiedCompanyAssociation ? "VERIFIED_FACT" : "INFERENCE",
    sourceVerified: verifiedCompanyAssociation,
    confidence: verifiedCompanyAssociation ? 95 : 65,
    strength,
    provenance: "PUBLIC_OFFICIAL",
  });
}
