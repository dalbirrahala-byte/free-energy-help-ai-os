export type ChannelEconomicsInput = Readonly<{
  channelId: string;
  channelName: string;
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

function normalizeInstant(value: string, code: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
}

function assertCount(value: number, code: string): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(code);
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
  if (!channelId || !channelName) throw new Error("invalid_channel_identity");
  if (!Number.isInteger(input.spendMinor) || input.spendMinor < 0) throw new Error("invalid_channel_spend");
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

  const totalSpendMinor = rows.reduce((sum, row) => sum + row.spendMinor, 0);
  const totalQualifiedOpportunities = rows.reduce((sum, row) => sum + row.qualifiedOpportunities, 0);
  const totalSignedContracts = rows.reduce((sum, row) => sum + row.signedContracts, 0);
  const ready = reasons.length === 0;

  if (ready) {
    reasons.push(
      "Commercial decisions should use cost per qualified opportunity and cost per signed contract.",
      "Cost per raw lead is diagnostic only and must not drive automatic budget allocation.",
    );
  }

  return {
    status: ready ? "READY_FOR_REVIEW" : "BLOCKED",
    windowStart,
    windowEnd,
    rows: [...rows].sort((a, b) => {
      const signedA = a.costPerSignedContractMinor ?? Number.POSITIVE_INFINITY;
      const signedB = b.costPerSignedContractMinor ?? Number.POSITIVE_INFINITY;
      if (signedA !== signedB) return signedA - signedB;
      const qualifiedA = a.costPerQualifiedOpportunityMinor ?? Number.POSITIVE_INFINITY;
      const qualifiedB = b.costPerQualifiedOpportunityMinor ?? Number.POSITIVE_INFINITY;
      return qualifiedA - qualifiedB;
    }),
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
