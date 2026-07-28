import { buildDashboardCounts } from "./analytics";
import type { DemoQuoteEngineSnapshot, DemoQuoteSummary, QuotePipelineStage } from "./types";

function groupPipeline(
  quotes: DemoQuoteSummary[],
): Record<QuotePipelineStage, DemoQuoteSummary[]> {
  const stages: QuotePipelineStage[] = [
    "Draft",
    "Pricing",
    "Internal Review",
    "Sent",
    "Negotiating",
    "Won",
    "Lost",
  ];

  return stages.reduce(
    (acc, stage) => {
      acc[stage] = quotes.filter((q) => q.pipelineStage === stage);
      return acc;
    },
    {} as Record<QuotePipelineStage, DemoQuoteSummary[]>,
  );
}

export function getDemoQuoteSummaries(): DemoQuoteSummary[] {
  return [
    {
      id: "q1",
      reference: "QTE-2026-0147",
      customerName: "Derby Manufacturing Ltd",
      siteName: "Riverside Industrial",
      fuel: "Dual",
      pipelineStage: "Negotiating",
      dashboardBucket: "Awaiting customer",
      updatedAt: "28 Jul 2026",
    },
    {
      id: "q2",
      reference: "QTE-2026-0139",
      customerName: "Peak Logistics Group",
      siteName: "M1 Hub",
      fuel: "Electricity",
      pipelineStage: "Pricing",
      dashboardBucket: "Quotes awaiting pricing",
      updatedAt: "28 Jul 2026",
    },
    {
      id: "q3",
      reference: "QTE-2026-0132",
      customerName: "Harbor Foods Ltd",
      siteName: "Cold Store A",
      fuel: "Gas",
      pipelineStage: "Internal Review",
      dashboardBucket: "Ready to send",
      updatedAt: "27 Jul 2026",
    },
    {
      id: "q4",
      reference: "QTE-2026-0128",
      customerName: "Summit Print Co",
      siteName: "City Works",
      fuel: "Electricity",
      pipelineStage: "Sent",
      dashboardBucket: "Awaiting customer",
      updatedAt: "26 Jul 2026",
    },
    {
      id: "q5",
      reference: "QTE-2026-0115",
      customerName: "Northbridge Care",
      siteName: "Main Campus",
      fuel: "Dual",
      pipelineStage: "Won",
      dashboardBucket: "Accepted",
      updatedAt: "20 Jul 2026",
    },
    {
      id: "q6",
      reference: "QTE-2026-0102",
      customerName: "Atlas Metals",
      siteName: "Forge Lane",
      fuel: "Electricity",
      pipelineStage: "Lost",
      dashboardBucket: "Lost",
      updatedAt: "15 Jul 2026",
    },
    {
      id: "q7",
      reference: "QTE-2026-0098",
      customerName: "Greenleaf Hotels",
      siteName: "Central Property",
      fuel: "Gas",
      pipelineStage: "Lost",
      dashboardBucket: "Expired",
      updatedAt: "10 Jul 2026",
    },
    {
      id: "q8",
      reference: "QTE-2026-0151",
      customerName: "Civic Workspace Ltd",
      siteName: "Block B",
      fuel: "Electricity",
      pipelineStage: "Draft",
      dashboardBucket: "Quotes awaiting pricing",
      updatedAt: "28 Jul 2026",
    },
    {
      id: "q9",
      reference: "QTE-2026-0144",
      customerName: "Meridian Labs",
      siteName: "Science Park",
      fuel: "Dual",
      pipelineStage: "Pricing",
      dashboardBucket: "Quotes awaiting pricing",
      updatedAt: "27 Jul 2026",
    },
    {
      id: "q10",
      reference: "QTE-2026-0136",
      customerName: "Oakwood Estates",
      siteName: "Retail Parade",
      fuel: "Gas",
      pipelineStage: "Internal Review",
      dashboardBucket: "Ready to send",
      updatedAt: "25 Jul 2026",
    },
  ];
}

export function getDemoQuoteEngineSnapshot(): DemoQuoteEngineSnapshot {
  const quotes = getDemoQuoteSummaries();

  return {
    dashboardCounts: buildDashboardCounts(quotes),
    pipeline: groupPipeline(quotes),
    builder: {
      reference: "QTE-2026-0147",
      customer: "Derby Manufacturing Ltd (demo)",
      site: "Riverside Industrial Estate, DE1 2TT (demo)",
      electricity: "420,000 kWh / year (demo)",
      gas: "180,000 kWh / year (demo)",
      contractLength: "36 months",
      meterType: "Half-hourly (HH) — demo",
      estimatedAnnualKwh: "600,000 kWh combined (demo)",
      standingCharge: "£0.45 / day elec · £0.28 / day gas (demo)",
      unitRates: "14.2p/kWh elec · 6.8p/kWh gas (demo)",
      brokerCommission: "£4,860 total (demo)",
      expectedMargin: "18.5% (demo)",
      estimatedCustomerSaving: "£8,420 vs current (demo)",
    },
    suppliers: [
      {
        id: "s1",
        supplier: "EDF Energy (demo)",
        term12: "£118,400",
        term24: "£114,200",
        term36: "£109,800",
        term48: "£107,600",
        term60: "£106,900",
        estimatedAnnualCost: "£109,800",
        commission: "£4,860",
        ranking: 1,
        recommended: true,
      },
      {
        id: "s2",
        supplier: "Opus Energy (demo)",
        term12: "£119,100",
        term24: "£115,400",
        term36: "£111,200",
        term48: "£109,100",
        term60: "£108,400",
        estimatedAnnualCost: "£111,200",
        commission: "£4,120",
        ranking: 2,
        recommended: false,
      },
      {
        id: "s3",
        supplier: "British Gas Lite (demo)",
        term12: "£121,800",
        term24: "£117,900",
        term36: "£113,500",
        term48: "£112,000",
        term60: "£111,600",
        estimatedAnnualCost: "£113,500",
        commission: "£3,640",
        ranking: 3,
        recommended: false,
      },
      {
        id: "s4",
        supplier: "SmartestEnergy (demo)",
        term12: "£120,500",
        term24: "£116,800",
        term36: "£112,400",
        term48: "£110,800",
        term60: "£110,200",
        estimatedAnnualCost: "£112,400",
        commission: "£3,980",
        ranking: 4,
        recommended: false,
      },
    ],
    pricing: {
      estimatedAnnualCost: "£109,800 (demo)",
      estimatedSaving: "£8,420 vs incumbent (demo)",
      brokerRevenue: "£4,860 commission (demo)",
      marginPct: "18.5% (demo)",
      customerBenefit: "Fixed 36-month price certainty + saving (demo)",
    },
    timeline: [
      {
        step: "Created",
        occurredAt: "22 Jul 2026 09:10",
        detail: "Quote QTE-2026-0147 opened by Alex Morgan (demo)",
        complete: true,
      },
      {
        step: "Priced",
        occurredAt: "22 Jul 2026 11:45",
        detail: "Supplier matrix priced — demo figures",
        complete: true,
      },
      {
        step: "Reviewed",
        occurredAt: "23 Jul 2026 08:30",
        detail: "Internal review sign-off (demo)",
        complete: true,
      },
      {
        step: "Sent",
        occurredAt: "24 Jul 2026 14:05",
        detail: "Proposal sent to Sarah Chen (demo)",
        complete: true,
      },
      {
        step: "Viewed",
        occurredAt: "25 Jul 2026 10:20",
        detail: "Customer viewed online portal (demo — not connected)",
        complete: true,
      },
      {
        step: "Accepted",
        occurredAt: "—",
        detail: "Awaiting customer decision",
        complete: false,
      },
      {
        step: "Contract generated",
        occurredAt: "—",
        detail: "Not configured in demo mode",
        complete: false,
      },
    ],
    notes: [
      {
        id: "n1",
        author: "Alex Morgan (demo)",
        createdAt: "23 Jul 2026 08:35",
        body: "Customer prefers 36-month fixed; highlight HH pass-through clarity in cover email.",
      },
      {
        id: "n2",
        author: "Jordan Lee (demo)",
        createdAt: "24 Jul 2026 13:50",
        body: "Pricing desk confirmed EDF row as recommended — margin within target band.",
      },
    ],
  };
}
