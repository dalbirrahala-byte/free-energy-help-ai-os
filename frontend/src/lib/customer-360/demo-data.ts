import type { Customer360DemoModules } from "./types";
import { formatUkDate } from "./analytics";

function baseDemo(customerId: number): Customer360DemoModules {
  return {
    contracts: [
      {
        id: `demo-c-${customerId}-1`,
        source: "demo",
        supplier: "EDF Energy (demo)",
        fuelType: "Electricity",
        contractType: "Fixed",
        startDate: "2024-08-01",
        endDate: "2026-07-31",
        startLabel: formatUkDate("2024-08-01"),
        endLabel: formatUkDate("2026-07-31"),
        term: "24 months",
        status: "Live",
        annualConsumption: "420,000 kWh (demo)",
        estimatedAnnualValue: "£84,000 (demo)",
        demoCommission: "£2,520 (demo)",
        renewalWindow: "90 days (demo)",
      },
      {
        id: `demo-c-${customerId}-2`,
        source: "demo",
        supplier: "British Gas Lite (demo)",
        fuelType: "Gas",
        contractType: "Fixed",
        startDate: "2023-01-01",
        endDate: "2025-12-31",
        startLabel: formatUkDate("2023-01-01"),
        endLabel: formatUkDate("2025-12-31"),
        term: "36 months",
        status: "Expired",
        annualConsumption: "180,000 kWh (demo)",
        estimatedAnnualValue: "£32,000 (demo)",
        demoCommission: "£960 (demo)",
        renewalWindow: "Closed (demo)",
      },
    ],
    electricityMeters: [
      {
        id: `demo-em-${customerId}-1`,
        source: "demo",
        mpan: "00 123 456 789 012 (demo)",
        profileClass: "00 (demo)",
        meterSerial: "E-884422 (demo)",
        hhNhh: "HH",
        currentSupplier: "EDF Energy (demo)",
        annualConsumption: "420,000 kWh (demo)",
        status: "Live (demo)",
      },
    ],
    gasMeters: [
      {
        id: `demo-gm-${customerId}-1`,
        source: "demo",
        mprn: "1234567890123 (demo)",
        meterSerial: "G-991100 (demo)",
        aq: "180,000 (demo)",
        currentSupplier: "British Gas Lite (demo)",
        status: "Live (demo)",
      },
    ],
    consumption: {
      source: "demo",
      electricityAnnualKwh: "420,000 kWh (demo)",
      gasAnnualKwh: "180,000 kWh (demo)",
      monthlyTrend: [
        { month: "Jan", electricityPct: 72, gasPct: 88 },
        { month: "Feb", electricityPct: 68, gasPct: 82 },
        { month: "Mar", electricityPct: 75, gasPct: 79 },
        { month: "Apr", electricityPct: 70, gasPct: 74 },
        { month: "May", electricityPct: 78, gasPct: 71 },
        { month: "Jun", electricityPct: 82, gasPct: 65 },
      ],
      peakUsage: "Nov–Jan peak (demo)",
      estimatedAnnualSpend: "£116,000 (demo)",
      alerts: ["HH profile variance flagged (demo)", "Gas winter peak above baseline (demo)"],
    },
    renewals: [
      {
        id: `demo-r-${customerId}-1`,
        source: "demo",
        contractEndDate: "2026-07-31",
        contractEndLabel: formatUkDate("2026-07-31"),
        daysRemaining: 368,
        supplier: "EDF Energy (demo)",
        fuel: "Electricity",
        urgency: "Medium (demo)",
        risk: "Medium (demo)",
        recommendedAction: "Book renewal review (demo)",
        nextTask: "Prepare HH consumption pack (demo)",
      },
    ],
    liveTransfers: [
      {
        id: `demo-lt-${customerId}-1`,
        source: "demo",
        transferAt: "28 Jul 2026 09:42 (demo)",
        sourceChannel: "Inbound — renewal line (demo)",
        agent: "Jordan Lee (demo)",
        outcome: "Connected",
        waitTime: "00:03:12 (demo)",
        status: "Completed (demo)",
        notes: "Customer asked about contract end date (demo record).",
      },
    ],
    quotes: [
      {
        id: `demo-q-${customerId}-1`,
        source: "demo",
        reference: "QTE-DEMO-2026-014",
        supplier: "Opus Energy (demo)",
        fuel: "Electricity",
        contractTerm: "24 months",
        annualValue: "£81,500 (demo)",
        demoCommission: "£2,445 (demo)",
        status: "Sent",
        sentDate: formatUkDate("2026-07-15"),
        expiryDate: formatUkDate("2026-08-15"),
      },
    ],
    commissions: [
      {
        id: `demo-co-${customerId}-1`,
        source: "demo",
        supplier: "EDF Energy (demo)",
        contract: "Electricity fixed (demo)",
        expectedAmount: "£2,520 (demo)",
        paidAmount: "£0 (demo)",
        outstandingAmount: "£2,520 (demo)",
        status: "Expected (demo)",
        expectedPaymentDate: formatUkDate("2026-09-30"),
        actualPaymentDate: "—",
      },
    ],
    appointments: [
      {
        id: `demo-ap-${customerId}-1`,
        source: "demo",
        title: "Renewal review (demo)",
        type: "Site visit",
        dueDate: formatUkDate("2026-08-05"),
        dueTime: "10:30",
        priority: "High",
        status: "Scheduled (demo)",
        assignedUser: "Alex Morgan (demo)",
      },
    ],
    documents: [
      {
        id: `demo-d-${customerId}-1`,
        source: "demo",
        name: "LOA — primary site (demo)",
        docType: "LOA",
        uploadedDate: formatUkDate("2026-06-01"),
        uploadedBy: "Alex Morgan (demo)",
        relatedTo: "Primary site (demo)",
        status: "Pending review (demo)",
      },
    ],
    timelineDemo: [
      {
        id: `demo-tl-${customerId}-1`,
        source: "demo",
        occurredAt: "2026-07-28T09:15:00",
        occurredLabel: "28 Jul 2026 09:15 (demo)",
        category: "Renewals",
        summary: "Renewal window opened in demo register",
      },
      {
        id: `demo-tl-${customerId}-2`,
        source: "demo",
        occurredAt: "2026-07-10T11:00:00",
        occurredLabel: "10 Jul 2026 11:00 (demo)",
        category: "Commission",
        summary: "Expected commission logged (demo only)",
      },
    ],
    aiRecommendations: [
      {
        id: `demo-ai-${customerId}-1`,
        source: "demo",
        title: "Prepare renewal pack",
        detail: "Demo: consolidate HH data before the 90-day renewal window.",
        priority: "High",
      },
      {
        id: `demo-ai-${customerId}-2`,
        source: "demo",
        title: "Confirm LOA on file",
        detail: "Demo: LOA status shows pending — verify before quoting.",
        priority: "Medium",
      },
    ],
    noteHistoryDemo: [
      {
        id: `demo-nh-${customerId}-1`,
        source: "demo",
        author: "Alex Morgan (demo)",
        createdAt: "15 Jul 2026 (demo)",
        body: "Demo note: customer prefers email contact for renewal discussions.",
      },
    ],
  };
}

export function getDemoModulesForCustomer(customerId: number): Customer360DemoModules {
  return baseDemo(customerId);
}

export function demoExecutiveOverlay(customerId: number) {
  const demo = baseDemo(customerId);

  return {
    accountManager: "Alex Morgan (demo)",
    riskStatus: "Medium (demo)",
    aiOpportunityScore: "72 / 100 (demo)",
    expectedDemoCommission: "£2,520 outstanding (demo)",
    activeContracts: `${demo.contracts.filter((c) => c.status === "Live").length} (demo register)`,
    electricityMeters: `${demo.electricityMeters.length} (demo)`,
    gasMeters: `${demo.gasMeters.length} (demo)`,
    openQuotes: `${demo.quotes.filter((q) => q.status === "Sent" || q.status === "Negotiation").length} (demo)`,
    outstandingDemoCommission: "£2,520 (demo)",
    renewalsDueCount: demo.renewals.length,
  };
}
