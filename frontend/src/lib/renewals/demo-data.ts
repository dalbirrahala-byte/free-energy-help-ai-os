import {
  DEMO_AS_OF_DATE,
  daysUntilContractEnd,
  pipelineWindowForDays,
  riskLevelFromScore,
  urgencyBandForDays,
} from "./urgency";
import type { DemoRenewalRecord, RenewalPipelineCounts } from "./types";

export { DEMO_AS_OF_DATE } from "./urgency";

type DemoSeed = Omit<
  DemoRenewalRecord,
  "daysUntilEnd" | "urgencyBand" | "pipelineWindow" | "riskLevel"
>;

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: "demo-001",
    customerName: "Derby Manufacturing Ltd",
    siteName: "Unit 4, Riverside Industrial Estate",
    supplier: "EDF Energy",
    contractEnd: "2026-08-15",
    estimatedAnnualConsumptionKwh: 420000,
    estimatedAnnualContractValueGbp: 48200,
    estimatedBrokerCommissionGbp: 1928,
    customerRiskScore: 62,
    lastContact: "2026-07-10",
    accountManager: "Alex Morgan",
    recommendedAction: "Schedule renewal review call and confirm meter data.",
    aiRecommendation:
      "Demo: Prioritise — contract inside 30 days; request latest half-hourly profile.",
    nextTask: "Call finance lead to confirm signatory",
    renewalHealthScore: 58,
    customerId: null,
  },
  {
    id: "demo-002",
    customerName: "Green Oak Hotels Group",
    siteName: "Green Oak Manchester",
    supplier: "British Gas Lite",
    contractEnd: "2026-08-22",
    estimatedAnnualConsumptionKwh: 890000,
    estimatedAnnualContractValueGbp: 118400,
    estimatedBrokerCommissionGbp: 4736,
    customerRiskScore: 71,
    lastContact: "2026-06-18",
    accountManager: "Priya Shah",
    recommendedAction: "Refresh multi-site benchmark and present 24-month options.",
    aiRecommendation:
      "Demo: High value — prepare consolidated quote pack for two sister sites.",
    nextTask: "Send draft term sheet for internal approval",
    renewalHealthScore: 51,
    customerId: null,
  },
  {
    id: "demo-003",
    customerName: "Midlands Cold Storage",
    siteName: "Cold Store A",
    supplier: "Drax",
    contractEnd: "2026-09-05",
    estimatedAnnualConsumptionKwh: 612000,
    estimatedAnnualContractValueGbp: 89600,
    estimatedBrokerCommissionGbp: 3584,
    customerRiskScore: 44,
    lastContact: "2026-07-22",
    accountManager: "Alex Morgan",
    recommendedAction: "Validate pass-through clauses before re-tender.",
    aiRecommendation: "Demo: Stable relationship — focus on pass-through transparency.",
    nextTask: "Collect LOA and current contract PDF",
    renewalHealthScore: 67,
    customerId: null,
  },
  {
    id: "demo-004",
    customerName: "Harbourview Dental Practices",
    siteName: "Main surgery",
    supplier: "SSE Business Energy",
    contractEnd: "2026-09-20",
    estimatedAnnualConsumptionKwh: 98000,
    estimatedAnnualContractValueGbp: 22400,
    estimatedBrokerCommissionGbp: 896,
    customerRiskScore: 38,
    lastContact: "2026-07-25",
    accountManager: "Jamie Cole",
    recommendedAction: "Offer fixed 12-month renewal with clear exit terms.",
    aiRecommendation: "Demo: Low complexity SME — standard fixed product suitable.",
    nextTask: "Email comparison table (demo template)",
    renewalHealthScore: 74,
    customerId: null,
  },
  {
    id: "demo-005",
    customerName: "Northbridge Logistics",
    siteName: "Depot 12",
    supplier: "E.ON Next",
    contractEnd: "2026-10-01",
    estimatedAnnualConsumptionKwh: 355000,
    estimatedAnnualContractValueGbp: 67300,
    estimatedBrokerCommissionGbp: 2692,
    customerRiskScore: 55,
    lastContact: "2026-07-01",
    accountManager: "Priya Shah",
    recommendedAction: "Confirm EV charge point load before pricing.",
    aiRecommendation: "Demo: Check capacity charges if EV expansion proceeds.",
    nextTask: "Site visit — meter and sub-meter check",
    renewalHealthScore: 63,
    customerId: null,
  },
  {
    id: "demo-006",
    customerName: "Cotswold Care Homes",
    siteName: "Willow House",
    supplier: "Opus Energy",
    contractEnd: "2026-10-18",
    estimatedAnnualConsumptionKwh: 248000,
    estimatedAnnualContractValueGbp: 54100,
    estimatedBrokerCommissionGbp: 2164,
    customerRiskScore: 48,
    lastContact: "2026-06-30",
    accountManager: "Jamie Cole",
    recommendedAction: "Engage facilities director on winter consumption forecast.",
    aiRecommendation: "Demo: Seasonal uplift likely — stress-test winter peak.",
    nextTask: "Request 12-month half-hourly export",
    renewalHealthScore: 69,
    customerId: null,
  },
  {
    id: "demo-007",
    customerName: "Peak Print & Packaging",
    siteName: "Press hall",
    supplier: "Scottish Power",
    contractEnd: "2026-11-02",
    estimatedAnnualConsumptionKwh: 142000,
    estimatedAnnualContractValueGbp: 31500,
    estimatedBrokerCommissionGbp: 1260,
    customerRiskScore: 33,
    lastContact: "2026-07-14",
    accountManager: "Alex Morgan",
    recommendedAction: "Maintain nurture sequence until 60-day window.",
    aiRecommendation: "Demo: On track — monitor competitor outreach in Q3.",
    nextTask: "Add to 60-day renewal campaign (demo)",
    renewalHealthScore: 78,
    customerId: null,
  },
  {
    id: "demo-008",
    customerName: "Silverline Data Centres",
    siteName: "Hall 2 — Colocation",
    supplier: "TotalEnergies",
    contractEnd: "2026-11-25",
    estimatedAnnualConsumptionKwh: 1850000,
    estimatedAnnualContractValueGbp: 214000,
    estimatedBrokerCommissionGbp: 8560,
    customerRiskScore: 76,
    lastContact: "2026-05-20",
    accountManager: "Priya Shah",
    recommendedAction: "Executive sponsor call — relationship at risk.",
    aiRecommendation:
      "Demo: High risk / high value — escalate to senior broker review.",
    nextTask: "Book QBR with procurement lead",
    renewalHealthScore: 42,
    customerId: null,
  },
  {
    id: "demo-009",
    customerName: "Fenland Agri Co-op",
    siteName: "Grain drying plant",
    supplier: "Corona Energy",
    contractEnd: "2026-12-10",
    estimatedAnnualConsumptionKwh: 118000,
    estimatedAnnualContractValueGbp: 28700,
    estimatedBrokerCommissionGbp: 1148,
    customerRiskScore: 29,
    lastContact: "2026-07-20",
    accountManager: "Jamie Cole",
    recommendedAction: "Hold until 90-day trigger; maintain quarterly touchpoint.",
    aiRecommendation: "Demo: Low risk — continue light-touch nurture.",
    nextTask: "Quarterly check-in email (demo script)",
    renewalHealthScore: 81,
    customerId: null,
  },
  {
    id: "demo-010",
    customerName: "Urban Fitness Studios",
    siteName: "City centre club",
    supplier: "Yü Energy",
    contractEnd: "2026-08-05",
    estimatedAnnualConsumptionKwh: 76000,
    estimatedAnnualContractValueGbp: 18900,
    estimatedBrokerCommissionGbp: 756,
    customerRiskScore: 68,
    lastContact: "2026-06-05",
    accountManager: "Alex Morgan",
    recommendedAction: "Urgent outreach — inside 30-day window.",
    aiRecommendation: "Demo: Critical window — same-day callback recommended.",
    nextTask: "Priority call — confirm renewal intent",
    renewalHealthScore: 47,
    customerId: null,
  },
];

function hydrate(seed: DemoSeed): DemoRenewalRecord | null {
  const daysUntilEnd = daysUntilContractEnd(seed.contractEnd, DEMO_AS_OF_DATE);
  const pipelineWindow = pipelineWindowForDays(daysUntilEnd);

  if (!pipelineWindow) {
    return null;
  }

  return {
    ...seed,
    daysUntilEnd,
    urgencyBand: urgencyBandForDays(daysUntilEnd),
    pipelineWindow,
    riskLevel: riskLevelFromScore(seed.customerRiskScore),
  };
}

/** Labelled demo dataset — not connected to live Supabase renewals. */
export function getDemoRenewalRecords(): DemoRenewalRecord[] {
  return DEMO_SEEDS.map(hydrate)
    .filter((record): record is DemoRenewalRecord => record !== null)
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
}

export function getDemoPipelineCounts(
  records: DemoRenewalRecord[],
): RenewalPipelineCounts {
  return {
    within30: records.filter((r) => r.pipelineWindow === "30").length,
    within60: records.filter((r) => r.pipelineWindow === "60").length,
    within90: records.filter((r) => r.pipelineWindow === "90").length,
    totalDemoRecords: records.length,
  };
}

export const DEMO_DATA_LABEL =
  "Demonstration data only — figures and AI text are illustrative, not live CRM or billing data.";

export function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDisplayDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatEac(kwh: number): string {
  return `${new Intl.NumberFormat("en-GB").format(kwh)} kWh (demo)`;
}
