import {
  buildIntentRadarSignal,
  type IntentRadarSignal,
  type IntentRadarSignalStrength,
} from "./intentRadar.ts";

export type CompaniesHouseCrawlerPlan = Readonly<{
  provider: "COMPANIES_HOUSE_PUBLIC_DATA_API";
  method: "GET";
  endpoint: string;
  apiKeyRequired: true;
  readOnly: true;
  maxRequestsPerWindow: 600;
  rateLimitWindowSeconds: 300;
  executionPerformed: false;
  credentialAccessed: false;
}>;

export type CompaniesHouseCompanyIdentity = Readonly<{
  companyName: string;
  companyNumber: string;
  companyDomain?: string | null;
}>;

export type CompaniesHouseFilingItem = Readonly<{
  transactionId: string;
  type: string;
  category: string;
  description: string;
  date: string;
}>;

type FilingTrigger = Readonly<{
  signalType: string;
  signalFamily: "BUSINESS_CHANGE" | "COMMERCIAL_INTELLIGENCE";
  strength: IntentRadarSignalStrength;
  confidence: number;
  ttlDays: number;
}>;

const FILING_TRIGGERS: Readonly<Record<string, FilingTrigger>> = {
  NEWINC: {
    signalType: "COMPANY_INCORPORATED",
    signalFamily: "BUSINESS_CHANGE",
    strength: "STRONG",
    confidence: 98,
    ttlDays: 45,
  },
  SH01: {
    signalType: "SHARE_ALLOTMENT_FILED",
    signalFamily: "COMMERCIAL_INTELLIGENCE",
    strength: "STRONG",
    confidence: 95,
    ttlDays: 45,
  },
  SH02: {
    signalType: "SHARE_CAPITAL_CHANGE_FILED",
    signalFamily: "COMMERCIAL_INTELLIGENCE",
    strength: "STRONG",
    confidence: 95,
    ttlDays: 45,
  },
  MR01: {
    signalType: "NEW_CHARGE_REGISTERED",
    signalFamily: "COMMERCIAL_INTELLIGENCE",
    strength: "STRONG",
    confidence: 95,
    ttlDays: 45,
  },
  AD01: {
    signalType: "REGISTERED_OFFICE_CHANGED",
    signalFamily: "BUSINESS_CHANGE",
    strength: "MEDIUM",
    confidence: 92,
    ttlDays: 30,
  },
  AA: {
    signalType: "ACCOUNTS_FILED",
    signalFamily: "COMMERCIAL_INTELLIGENCE",
    strength: "MEDIUM",
    confidence: 92,
    ttlDays: 30,
  },
  AP01: {
    signalType: "DIRECTOR_APPOINTED",
    signalFamily: "BUSINESS_CHANGE",
    strength: "WEAK",
    confidence: 90,
    ttlDays: 14,
  },
  TM01: {
    signalType: "DIRECTOR_TERMINATION_FILED",
    signalFamily: "BUSINESS_CHANGE",
    strength: "WEAK",
    confidence: 90,
    ttlDays: 14,
  },
  CS01: {
    signalType: "CONFIRMATION_STATEMENT_FILED",
    signalFamily: "BUSINESS_CHANGE",
    strength: "WEAK",
    confidence: 90,
    ttlDays: 14,
  },
};

function cleanToken(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCompanyNumber(value: string): string {
  const cleaned = cleanToken(value).replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6,10}$/.test(cleaned)) throw new Error("invalid_company_number");
  return cleaned;
}

function normalizeTransactionId(value: string): string {
  const cleaned = cleanToken(value);
  if (!cleaned || cleaned.length > 160) throw new Error("invalid_transaction_id");
  return cleaned;
}

function filingTypeKey(value: string): string {
  const cleaned = cleanToken(value).toUpperCase();
  if (FILING_TRIGGERS[cleaned]) return cleaned;
  if (/^AA/.test(cleaned)) return "AA";
  return cleaned;
}

function addDays(instant: string, days: number): string {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid_filing_date");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString();
}

export function planCompaniesHouseFilingCrawl(companyNumber: string): CompaniesHouseCrawlerPlan {
  const normalized = normalizeCompanyNumber(companyNumber);
  return {
    provider: "COMPANIES_HOUSE_PUBLIC_DATA_API",
    method: "GET",
    endpoint: `https://api.company-information.service.gov.uk/company/${encodeURIComponent(normalized)}/filing-history`,
    apiKeyRequired: true,
    readOnly: true,
    maxRequestsPerWindow: 600,
    rateLimitWindowSeconds: 300,
    executionPerformed: false,
    credentialAccessed: false,
  };
}

export function mapCompaniesHouseFilingToIntentSignal(
  company: CompaniesHouseCompanyIdentity,
  filing: CompaniesHouseFilingItem,
): IntentRadarSignal | null {
  const trigger = FILING_TRIGGERS[filingTypeKey(filing.type)];
  if (!trigger) return null;

  const companyNumber = normalizeCompanyNumber(company.companyNumber);
  const transactionId = normalizeTransactionId(filing.transactionId);
  const filingDate = new Date(filing.date);
  if (Number.isNaN(filingDate.getTime())) throw new Error("invalid_filing_date");
  const observedAt = filingDate.toISOString();
  const description = cleanToken(filing.description);
  const category = cleanToken(filing.category);
  if (!description || !category) throw new Error("invalid_filing_metadata");

  return buildIntentRadarSignal({
    companyName: company.companyName,
    companyNumber,
    companyDomain: company.companyDomain ?? null,
    source: "COMPANIES_HOUSE",
    sourceReference: `filing:${transactionId}`,
    sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}/filing-history`,
    observedAt,
    expiresAt: addDays(observedAt, trigger.ttlDays),
    signalFamily: trigger.signalFamily,
    signalType: trigger.signalType,
    summary: `Companies House filing ${filing.type}: ${description} (${category}).`,
    evidenceBasis: "VERIFIED_FACT",
    sourceVerified: true,
    confidence: trigger.confidence,
    strength: trigger.strength,
    provenance: "PUBLIC_OFFICIAL",
  });
}

export function selectCompaniesHouseTriggerSignals(
  company: CompaniesHouseCompanyIdentity,
  filings: readonly CompaniesHouseFilingItem[],
): readonly IntentRadarSignal[] {
  const mapped = filings
    .map((filing) => mapCompaniesHouseFilingToIntentSignal(company, filing))
    .filter((signal): signal is IntentRadarSignal => signal !== null);

  return [...new Map(mapped.map((signal) => [signal.idempotencyKey, signal])).values()]
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}
