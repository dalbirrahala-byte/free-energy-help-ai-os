export type LeadBenchmarkSourceKind = "EXCLUSIVE_PROVIDER" | "FEH_GENERATED";
export type LeadBenchmarkEvidenceBasis = "OBSERVED_VERIFIED" | "ESTIMATED";

export type LeadBenchmarkCohortInput = Readonly<{
  sourceKind: LeadBenchmarkSourceKind;
  sourceName: string;
  sourceReference: string;
  evidenceBasis: LeadBenchmarkEvidenceBasis;
  windowStart: string;
  windowEnd: string;
  qualificationDefinitionVersion: string;
  acquisitionCostMinor: number;
  rawLeads: number;
  qualifiedOpportunities: number;
  signedContracts: number;
}>;

export type LeadBenchmarkCohort = Readonly<LeadBenchmarkCohortInput & {
  sourceName: string;
  sourceReference: string;
  windowStart: string;
  windowEnd: string;
  rawToQualifiedRate: number | null;
  qualifiedToSignedRate: number | null;
  costPerQualifiedOpportunityMinor: number | null;
  costPerSignedContractMinor: number | null;
}>;

export type ControlledLeadBenchmark = Readonly<{
  status: "READY_FOR_HUMAN_REVIEW" | "BLOCKED";
  exclusiveProvider: LeadBenchmarkCohort;
  fehGenerated: LeadBenchmarkCohort;
  qualifiedEconomicsWinner: "EXCLUSIVE_PROVIDER" | "FEH_GENERATED" | "TIE" | "INSUFFICIENT_DATA";
  signedContractEconomicsWinner: "EXCLUSIVE_PROVIDER" | "FEH_GENERATED" | "TIE" | "INSUFFICIENT_DATA";
  reasons: readonly string[];
  providerPurchaseAllowed: false;
  budgetChangeAllowed: false;
  crmWriteAllowed: false;
}>;

function clean(value: string | null | undefined, max = 160): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeReference(value: string | null | undefined): string {
  const cleaned = clean(value, 300);
  if (!cleaned) throw new Error("invalid_benchmark_source_reference");
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

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function unitCost(costMinor: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round(costMinor / count);
}

export function buildLeadBenchmarkCohort(input: LeadBenchmarkCohortInput): LeadBenchmarkCohort {
  const sourceName = clean(input.sourceName);
  const sourceReference = normalizeReference(input.sourceReference);
  const definition = clean(input.qualificationDefinitionVersion);
  if (!sourceName || !definition) throw new Error("invalid_benchmark_metadata");
  if (input.evidenceBasis !== "OBSERVED_VERIFIED" && input.evidenceBasis !== "ESTIMATED") {
    throw new Error("invalid_benchmark_evidence_basis");
  }
  if (!Number.isSafeInteger(input.acquisitionCostMinor) || input.acquisitionCostMinor < 0) {
    throw new Error("invalid_acquisition_cost");
  }
  assertCount(input.rawLeads, "invalid_raw_leads");
  assertCount(input.qualifiedOpportunities, "invalid_qualified_opportunities");
  assertCount(input.signedContracts, "invalid_signed_contracts");
  if (input.qualifiedOpportunities > input.rawLeads) throw new Error("qualified_exceeds_raw_leads");
  if (input.signedContracts > input.qualifiedOpportunities) throw new Error("signed_exceeds_qualified");

  const windowStart = normalizeInstant(input.windowStart, "invalid_window_start");
  const windowEnd = normalizeInstant(input.windowEnd, "invalid_window_end");
  if (new Date(windowEnd).getTime() <= new Date(windowStart).getTime()) throw new Error("invalid_benchmark_window");

  return {
    ...input,
    sourceName,
    sourceReference,
    qualificationDefinitionVersion: definition,
    windowStart,
    windowEnd,
    rawToQualifiedRate: ratio(input.qualifiedOpportunities, input.rawLeads),
    qualifiedToSignedRate: ratio(input.signedContracts, input.qualifiedOpportunities),
    costPerQualifiedOpportunityMinor: unitCost(input.acquisitionCostMinor, input.qualifiedOpportunities),
    costPerSignedContractMinor: unitCost(input.acquisitionCostMinor, input.signedContracts),
  };
}

function lowerCostWinner(
  exclusiveCost: number | null,
  fehCost: number | null,
): ControlledLeadBenchmark["qualifiedEconomicsWinner"] {
  if (exclusiveCost === null || fehCost === null) return "INSUFFICIENT_DATA";
  if (exclusiveCost === fehCost) return "TIE";
  return exclusiveCost < fehCost ? "EXCLUSIVE_PROVIDER" : "FEH_GENERATED";
}

export function buildControlledLeadBenchmark(
  exclusiveInput: LeadBenchmarkCohortInput,
  fehInput: LeadBenchmarkCohortInput,
): ControlledLeadBenchmark {
  if (exclusiveInput.sourceKind !== "EXCLUSIVE_PROVIDER") throw new Error("exclusive_cohort_required");
  if (fehInput.sourceKind !== "FEH_GENERATED") throw new Error("feh_cohort_required");

  const exclusiveProvider = buildLeadBenchmarkCohort(exclusiveInput);
  const fehGenerated = buildLeadBenchmarkCohort(fehInput);
  const reasons: string[] = [];

  if (exclusiveProvider.windowStart !== fehGenerated.windowStart || exclusiveProvider.windowEnd !== fehGenerated.windowEnd) {
    reasons.push("Benchmark cohorts must use the same observation window.");
  }
  if (exclusiveProvider.qualificationDefinitionVersion !== fehGenerated.qualificationDefinitionVersion) {
    reasons.push("Benchmark cohorts must use the same qualified-opportunity definition.");
  }
  if (exclusiveProvider.sourceName.toLowerCase() === fehGenerated.sourceName.toLowerCase()) {
    reasons.push("Exclusive-provider and FEH-generated cohorts must be separately attributable.");
  }
  if (exclusiveProvider.evidenceBasis !== "OBSERVED_VERIFIED" || fehGenerated.evidenceBasis !== "OBSERVED_VERIFIED") {
    reasons.push("Benchmark winner requires observed verified cohort data; estimates may be retained as planning context only.");
  }

  const ready = reasons.length === 0;
  if (ready) {
    reasons.push(
      "Benchmark compares qualified-opportunity and signed-contract economics; raw lead volume is diagnostic only.",
      "Result is evidence for human commercial review and does not authorize purchasing leads or changing budget.",
    );
  }

  return {
    status: ready ? "READY_FOR_HUMAN_REVIEW" : "BLOCKED",
    exclusiveProvider,
    fehGenerated,
    qualifiedEconomicsWinner: ready
      ? lowerCostWinner(exclusiveProvider.costPerQualifiedOpportunityMinor, fehGenerated.costPerQualifiedOpportunityMinor)
      : "INSUFFICIENT_DATA",
    signedContractEconomicsWinner: ready
      ? lowerCostWinner(exclusiveProvider.costPerSignedContractMinor, fehGenerated.costPerSignedContractMinor)
      : "INSUFFICIENT_DATA",
    reasons,
    providerPurchaseAllowed: false,
    budgetChangeAllowed: false,
    crmWriteAllowed: false,
  };
}
