import { outstandingForRecord } from "./calculations";
import type { DemoCommissionRecord } from "./types";

type DemoSeed = Omit<
  DemoCommissionRecord,
  | "outstandingAmountGbp"
  | "pipelineStage"
  | "paymentPriority"
  | "atRiskReason"
  | "recommendedAction"
  | "demoPipelineTrend"
>;

const SEEDS: DemoSeed[] = [
  {
    id: "demo-c001",
    customer: "Derby Manufacturing Ltd",
    site: "Riverside Industrial Estate",
    supplier: "EDF Energy",
    contractLabel: "Fixed 24-month supply",
    fuelType: "Electricity",
    contractStart: "2024-08-01",
    contractEnd: "2026-07-31",
    consumptionKwh: 420000,
    commissionModel: "ppkwh",
    modelDetail: "0.46 p/kWh demo rate",
    expectedAmountGbp: 1932,
    paidAmountGbp: 0,
    status: "Expected",
    expectedPaymentDate: "2026-08-15",
    actualPaymentDate: null,
    accountManager: "Alex Morgan",
    notes: "Demo renewal commission — awaiting supplier statement.",
    demoCostAllocationGbp: 420,
  },
  {
    id: "demo-c002",
    customer: "Green Oak Hotels Group",
    site: "Green Oak Manchester",
    supplier: "British Gas Lite",
    contractLabel: "Multi-site framework",
    fuelType: "Dual fuel",
    contractStart: "2023-09-01",
    contractEnd: "2026-08-31",
    consumptionKwh: 890000,
    commissionModel: "hybrid",
    modelDetail: "Fixed £2,500 + 0.12 p/kWh demo",
    expectedAmountGbp: 4736,
    paidAmountGbp: 4736,
    status: "Paid",
    expectedPaymentDate: "2026-06-30",
    actualPaymentDate: "2026-07-02",
    accountManager: "Priya Shah",
    notes: "Demo — paid in full.",
    demoCostAllocationGbp: 980,
  },
  {
    id: "demo-c003",
    customer: "Midlands Cold Storage",
    site: "Cold Store A",
    supplier: "Drax",
    contractLabel: "Pass-through supply",
    fuelType: "Electricity",
    contractStart: "2024-10-01",
    contractEnd: "2026-09-30",
    consumptionKwh: 610000,
    commissionModel: "ppkwh",
    modelDetail: "0.59 p/kWh demo rate",
    expectedAmountGbp: 3584,
    paidAmountGbp: 1800,
    status: "Part Paid",
    expectedPaymentDate: "2026-07-20",
    actualPaymentDate: "2026-07-18",
    accountManager: "Alex Morgan",
    notes: "Demo part payment received.",
    demoCostAllocationGbp: 710,
  },
  {
    id: "demo-c004",
    customer: "Silverline Data Centres",
    site: "Hall 2 — Colocation",
    supplier: "TotalEnergies",
    contractLabel: "High load HH supply",
    fuelType: "Electricity",
    contractStart: "2022-11-01",
    contractEnd: "2025-11-30",
    consumptionKwh: 2100000,
    commissionModel: "fixed",
    modelDetail: "Fixed £8,560 demo commission",
    expectedAmountGbp: 8560,
    paidAmountGbp: 0,
    status: "Overdue",
    expectedPaymentDate: "2026-05-15",
    actualPaymentDate: null,
    accountManager: "Priya Shah",
    notes: "Demo overdue — chase supplier remittance.",
    demoCostAllocationGbp: 1200,
  },
  {
    id: "demo-c005",
    customer: "Harbourview Dental Practices",
    site: "Main surgery",
    supplier: "SSE Business Energy",
    contractLabel: "SME fixed 12-month",
    fuelType: "Gas",
    contractStart: "2025-09-01",
    contractEnd: "2026-08-31",
    consumptionKwh: 95000,
    commissionModel: "fixed",
    modelDetail: "Fixed £896 demo",
    expectedAmountGbp: 896,
    paidAmountGbp: 0,
    status: "Invoiced",
    expectedPaymentDate: "2026-07-10",
    actualPaymentDate: null,
    accountManager: "Jamie Cole",
    notes: "Demo invoiced — no payment logged.",
    demoCostAllocationGbp: 180,
  },
  {
    id: "demo-c006",
    customer: "Northbridge Logistics",
    site: "Depot 12",
    supplier: "E.ON Next",
    contractLabel: "Flex contract",
    fuelType: "Electricity",
    contractStart: "2025-10-01",
    contractEnd: "2026-09-30",
    consumptionKwh: 380000,
    commissionModel: "ppkwh",
    modelDetail: "0.71 p/kWh demo",
    expectedAmountGbp: 2692,
    paidAmountGbp: 0,
    status: "Disputed",
    expectedPaymentDate: "2026-08-01",
    actualPaymentDate: null,
    accountManager: "Priya Shah",
    notes: "Demo supplier dispute on consumption band.",
    demoCostAllocationGbp: 520,
  },
  {
    id: "demo-c007",
    customer: "Peak Print & Packaging",
    site: "Press hall",
    supplier: "Scottish Power",
    contractLabel: "Renewal 2026",
    fuelType: "Electricity",
    contractStart: "2026-01-01",
    contractEnd: "2027-12-31",
    consumptionKwh: 210000,
    commissionModel: "fixed",
    modelDetail: "Fixed £1,260 demo",
    expectedAmountGbp: 1260,
    paidAmountGbp: 0,
    status: "Forecast",
    expectedPaymentDate: "2026-11-30",
    actualPaymentDate: null,
    accountManager: "Alex Morgan",
    notes: "Demo forecast — contract not yet live for payment.",
    demoCostAllocationGbp: 240,
  },
  {
    id: "demo-c008",
    customer: "Urban Fitness Studios",
    site: "City centre club",
    supplier: "Yü Energy",
    contractLabel: "Cancelled switch",
    fuelType: "Gas",
    contractStart: "2024-08-01",
    contractEnd: "2025-07-31",
    consumptionKwh: 62000,
    commissionModel: "fixed",
    modelDetail: "Fixed £756 demo",
    expectedAmountGbp: 756,
    paidAmountGbp: 0,
    status: "Cancelled",
    expectedPaymentDate: null,
    actualPaymentDate: null,
    accountManager: "Alex Morgan",
    notes: "Demo cancelled — customer did not proceed.",
    demoCostAllocationGbp: 90,
  },
  {
    id: "demo-c009",
    customer: "Cotswold Care Homes",
    site: "Willow House",
    supplier: "Opus Energy",
    contractLabel: "Care sector renewal",
    fuelType: "Dual fuel",
    contractStart: "2024-11-01",
    contractEnd: "2026-10-31",
    consumptionKwh: 520000,
    commissionModel: "ppkwh",
    modelDetail: "0.42 p/kWh demo",
    expectedAmountGbp: 2164,
    paidAmountGbp: 2164,
    status: "Paid",
    expectedPaymentDate: "2026-04-30",
    actualPaymentDate: "2026-05-05",
    accountManager: "Jamie Cole",
    notes: "Demo YTD paid example.",
    demoCostAllocationGbp: 440,
  },
  {
    id: "demo-c010",
    customer: "Fenland Agri Co-op",
    site: "Grain drying plant",
    supplier: "Corona Energy",
    contractLabel: "Seasonal gas",
    fuelType: "Gas",
    contractStart: "2025-12-01",
    contractEnd: "2026-11-30",
    consumptionKwh: 180000,
    commissionModel: "ppkwh",
    modelDetail: "0.64 p/kWh demo",
    expectedAmountGbp: 1148,
    paidAmountGbp: 900,
    status: "Paid",
    expectedPaymentDate: "2026-03-15",
    actualPaymentDate: "2026-03-20",
    accountManager: "Jamie Cole",
    notes: "Demo reconciliation — paid below expected.",
    demoCostAllocationGbp: 210,
  },
];

function enrichSeed(seed: DemoSeed): Omit<DemoCommissionRecord, "outstandingAmountGbp"> {
  const pipelineStage = derivePipelineStage(seed.status);
  return {
    ...seed,
    pipelineStage,
    paymentPriority: derivePriority(seed),
    atRiskReason: deriveAtRiskReason(seed),
    recommendedAction: deriveRecommendedAction(seed),
    demoPipelineTrend: "Demo",
  };
}

function derivePipelineStage(status: DemoCommissionRecord["status"]) {
  switch (status) {
    case "Forecast":
      return "Awaiting Supplier Validation" as const;
    case "Expected":
      return "Supplier Approved" as const;
    case "Invoiced":
      return "Invoice Raised" as const;
    case "Part Paid":
    case "Overdue":
      return "Awaiting Payment" as const;
    case "Paid":
      return "Paid" as const;
    case "Disputed":
      return "Disputed" as const;
    case "Cancelled":
      return "Cancelled" as const;
    default:
      return "Awaiting Payment" as const;
  }
}

function derivePriority(seed: DemoSeed): DemoCommissionRecord["paymentPriority"] {
  if (seed.status === "Overdue" || seed.status === "Disputed") {
    return "High";
  }

  if (seed.status === "Invoiced" || seed.status === "Part Paid") {
    return "Medium";
  }

  return "Low";
}

function deriveAtRiskReason(seed: DemoSeed): DemoCommissionRecord["atRiskReason"] {
  if (seed.status === "Overdue") {
    return "Expected payment overdue";
  }

  if (seed.status === "Disputed") {
    return "Supplier dispute";
  }

  if (seed.id === "demo-c005") {
    return "Missing paperwork";
  }

  if (seed.id === "demo-c001") {
    return "Contract validation required";
  }

  if (seed.id === "demo-c010") {
    return "Expected payment overdue";
  }

  return null;
}

function deriveRecommendedAction(seed: DemoSeed): string {
  const actions: Record<string, string> = {
    "demo-c001": "Demo: Complete supplier validation checklist before invoice.",
    "demo-c004": "Demo: Escalate overdue remittance with TotalEnergies.",
    "demo-c005": "Demo: Request signed LOA and commission schedule from supplier.",
    "demo-c006": "Demo: Open dispute case and pause forecast recognition.",
    "demo-c010": "Demo: Reconcile part-paid ledger before closing contract.",
  };

  return (
    actions[seed.id] ??
    "Demo: Review commission record and update status when supplier confirms."
  );
}

function hydrate(seed: DemoSeed): DemoCommissionRecord {
  const enriched = enrichSeed(seed);
  return {
    ...enriched,
    outstandingAmountGbp: outstandingForRecord({
      ...enriched,
      outstandingAmountGbp: 0,
    }),
  };
}

export function getDemoCommissionRecords(): DemoCommissionRecord[] {
  return SEEDS.map(hydrate);
}

export function uniqueFilterValues(
  records: DemoCommissionRecord[],
  key: keyof Pick<
    DemoCommissionRecord,
    "supplier" | "customer" | "fuelType" | "accountManager"
  >,
): string[] {
  return [...new Set(records.map((record) => record[key]))].sort();
}

export function availableMonthKeys(records: DemoCommissionRecord[]): string[] {
  const keys = new Set<string>();

  for (const record of records) {
    if (record.expectedPaymentDate) {
      keys.add(record.expectedPaymentDate.slice(0, 7));
    }
    if (record.actualPaymentDate) {
      keys.add(record.actualPaymentDate.slice(0, 7));
    }
  }

  return [...keys].sort().reverse();
}
