export type ChannelEconomicsEvidenceBasis = "OBSERVED_VERIFIED" | "ESTIMATED";

export type ChannelEconomicsInput = Readonly<{
  channelId: string;
  channelName: string;
  sourceReference: string;
  evidenceBasis: ChannelEconomicsEvidenceBasis;
  windowStart: string;
  windowEnd: string;
  spendMinor: number;
  rawLeads: number;
  qualifiedOpportunities: number;
  signedContracts: number;
}>;

export type ChannelEconomicsRow = Readonly<ChannelEconomicsInput & {
  channelId: string;
  channelName: string;
  sourceReference: string;
  windowStart: string;
  windowEnd: string;
  costPerQualifiedOpportunityMinor: number | null;
  costPerSignedContractMinor: number | null;
  qualifiedToSignedRate: number | null;
  rawLeadCostMinor: number | null;
  decisionMetricStatus: "MEASURABLE" | "NO_QUALIFIED_OPPORTUNITIES" | "NO_SIGNED_CONTRACTS";
}>;

export type ChannelEconomicsDashboard = Readonly<{
  status: "READY_FOR_REVIEW" | "BLOCKED";
  windowStart: string | null;
  windowEnd: string | null;
  rows: readonly ChannelEconomicsRow[];
  totalSpendMinor: number;
  totalQualifiedOpportunities: number;
  totalSignedContracts: number;
  blendedCostPerQualifiedOpportunityMinor: number | null;
  blendedCostPerSignedContractMinor: number | null;
  reasons: readonly string[];
  budgetReallocationAllowed: false;
  campaignActivationAllowed: false;
}>;

function clean(value: string | null | undefined, max = 160): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeReference(value: string | null | undefined): string {
  const cleaned = clean(value, 300);
  if (!cleaned || !/^[A-Za-z0-9._:-]+$/.test(cleaned)) throw new Error("invalid_channel_source_reference");
  return cleaned;
}

function normalizeInstant(value: string, code: string): string {
  const cleaned = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(cleaned);
  if (!match) throw new Error(code);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12) throw new Error(code);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) throw new Error(code);
  if (hour > 23 || minute > 59 || second > 59) throw new Error(code);

  if (match[8] !== "Z") {
    const offsetHour = Number(match[10]);
    const offsetMinute = Number(match[11]);
    if (offsetHour > 14 || offsetMinute > 59) throw new Error(code);
    if (offsetHour === 14 && offsetMinute !== 0) throw new Error(code);
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
}

function assertCount(value: number, code: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(code);
}

function unitCost(spendMinor: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round(spendMinor / count);
}

function conversionRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function buildChannelEconomicsRow(input: ChannelEconomicsInput): ChannelEconomicsRow {
  const channelId = clean(input.channelId, 100);
  const channelName = clean(input.channelName, 160);
  const sourceReference = normalizeReference(input.sourceReference);
  if (!channelId || !channelName) throw new Error("invalid_channel_identity");
  if (input.evidenceBasis !== "OBSERVED_VERIFIED" && input.evidenceBasis !== "ESTIMATED") {
    throw new Error("invalid_channel_evidence_basis");
  }
  if (!Number.isSafeInteger(input.spendMinor) || input.spendMinor < 0) throw new Error("invalid_channel_spend");
  assertCount(input.rawLeads, "invalid_raw_leads");
  assertCount(input.qualifiedOpportunities, "invalid_qualified_opportunities");
  assertCount(input.signedContracts, "invalid_signed_contracts");
  if (input.qualifiedOpportunities > input.rawLeads) throw new Error("qualified_exceeds_raw_leads");
  if (input.signedContracts > input.qualifiedOpportunities) throw new Error("signed_exceeds_qualified");

  const windowStart = normalizeInstant(input.windowStart, "invalid_window_start");
  const windowEnd = normalizeInstant(input.windowEnd, "invalid_window_end");
  if (new Date(windowEnd).getTime() <= new Date(windowStart).getTime()) throw new Error("invalid_channel_window");

  const decisionMetricStatus = input.qualifiedOpportunities === 0
    ? "NO_QUALIFIED_OPPORTUNITIES"
    : input.signedContracts === 0
      ? "NO_SIGNED_CONTRACTS"
      : "MEASURABLE";

  return {
    ...input,
    channelId,
    channelName,
    sourceReference,
    windowStart,
    windowEnd,
    costPerQualifiedOpportunityMinor: unitCost(input.spendMinor, input.qualifiedOpportunities),
    costPerSignedContractMinor: unitCost(input.spendMinor, input.signedContracts),
    qualifiedToSignedRate: conversionRate(input.signedContracts, input.qualifiedOpportunities),
    rawLeadCostMinor: unitCost(input.spendMinor, input.rawLeads),
    decisionMetricStatus,
  };
}

export function buildChannelEconomicsDashboard(
  inputs: readonly ChannelEconomicsInput[],
): ChannelEconomicsDashboard {
  if (inputs.length === 0) {
    return {
      status: "BLOCKED",
      windowStart: null,
      windowEnd: null,
      rows: [],
      totalSpendMinor: 0,
      totalQualifiedOpportunities: 0,
      totalSignedContracts: 0,
      blendedCostPerQualifiedOpportunityMinor: null,
      blendedCostPerSignedContractMinor: null,
      reasons: ["No channel economics observations supplied."],
      budgetReallocationAllowed: false,
      campaignActivationAllowed: false,
    };
  }

  const rows = inputs.map(buildChannelEconomicsRow);
  const windowStart = rows[0].windowStart;
  const windowEnd = rows[0].windowEnd;
  const reasons: string[] = [];

  if (rows.some((row) => row.windowStart !== windowStart || row.windowEnd !== windowEnd)) {
    reasons.push("All channels must use the same observation window before economics can be compared.");
  }
  if (new Set(rows.map((row) => row.channelId.toLowerCase())).size !== rows.length) {
    reasons.push("Channel identifiers must be unique.");
  }
  if (rows.some((row) => row.evidenceBasis !== "OBSERVED_VERIFIED")) {
    reasons.push("Cross-channel economics require observed verified source data; estimates are planning context only.");
  }

  const totalSpendMinor = rows.reduce((sum, row) => sum + row.spendMinor, 0);
  const totalQualifiedOpportunities = rows.reduce((sum, row) => sum + row.qualifiedOpportunities, 0);
  const totalSignedContracts = rows.reduce((sum, row) => sum + row.signedContracts, 0);
  if (![totalSpendMinor, totalQualifiedOpportunities, totalSignedContracts].every(Number.isSafeInteger)) {
    reasons.push("Aggregated channel economics exceed safe integer precision.");
  }
  const ready = reasons.length === 0;

  if (ready) {
    reasons.push(
      "Commercial decisions should use cost per qualified opportunity and cost per signed contract.",
      "Cost per raw lead is diagnostic only and must not drive automatic budget allocation.",
    );
  }

  const orderedRows = ready
    ? [...rows].sort((a, b) => {
        const signedA = a.costPerSignedContractMinor ?? Number.POSITIVE_INFINITY;
        const signedB = b.costPerSignedContractMinor ?? Number.POSITIVE_INFINITY;
        if (signedA !== signedB) return signedA - signedB;
        const qualifiedA = a.costPerQualifiedOpportunityMinor ?? Number.POSITIVE_INFINITY;
        const qualifiedB = b.costPerQualifiedOpportunityMinor ?? Number.POSITIVE_INFINITY;
        return qualifiedA - qualifiedB;
      })
    : [...rows].sort((a, b) => a.channelId.localeCompare(b.channelId));

  return {
    status: ready ? "READY_FOR_REVIEW" : "BLOCKED",
    windowStart,
    windowEnd,
    rows: orderedRows,
    totalSpendMinor,
    totalQualifiedOpportunities,
    totalSignedContracts,
    blendedCostPerQualifiedOpportunityMinor: ready ? unitCost(totalSpendMinor, totalQualifiedOpportunities) : null,
    blendedCostPerSignedContractMinor: ready ? unitCost(totalSpendMinor, totalSignedContracts) : null,
    reasons,
    budgetReallocationAllowed: false,
    campaignActivationAllowed: false,
  };
}
