import { DEMO_AS_OF_DATE } from "./constants";
import type {
  ActivityEvent,
  DemoLiveTransfer,
  DemoTransferAgent,
  LiveTransferKpis,
} from "./types";

const TRANSFERS: DemoLiveTransfer[] = [
  {
    id: "lt-001",
    businessName: "Peak Logistics Midlands",
    contactName: "Sarah Chen",
    telephone: "01332 441200",
    postcode: "DE1 2TT",
    businessType: "Warehouse & distribution",
    fuelType: "Electricity",
    estimatedElectricityKwh: 420000,
    estimatedGasKwh: null,
    currentSupplier: "EDF Energy",
    contractEndDate: "2026-09-30",
    priority: "Critical",
    status: "Waiting",
    assignedAgent: null,
    timeWaitingSeconds: 28,
    leadId: 1,
    demoExpectedRevenueGbp: 1850,
  },
  {
    id: "lt-002",
    businessName: "Harbour Dental Group",
    contactName: "James Patel",
    telephone: "01273 882910",
    postcode: "BN1 4GW",
    businessType: "Healthcare",
    fuelType: "Dual fuel",
    estimatedElectricityKwh: 62000,
    estimatedGasKwh: 33000,
    currentSupplier: "British Gas Lite",
    contractEndDate: "2026-08-15",
    priority: "High",
    status: "Calling",
    assignedAgent: "Alex Morgan",
    timeWaitingSeconds: 45,
    leadId: null,
    demoExpectedRevenueGbp: 620,
  },
  {
    id: "lt-003",
    businessName: "Cotswold Brew Co",
    contactName: "Emma Wright",
    telephone: "01285 653120",
    postcode: "GL7 1YG",
    businessType: "Food & beverage",
    fuelType: "Dual fuel",
    estimatedElectricityKwh: 145000,
    estimatedGasKwh: 65000,
    currentSupplier: "Drax",
    contractEndDate: "2026-11-01",
    priority: "Medium",
    status: "Connected",
    assignedAgent: "Priya Shah",
    timeWaitingSeconds: 92,
    leadId: null,
    demoExpectedRevenueGbp: 980,
  },
  {
    id: "lt-004",
    businessName: "Silverline Data Hall",
    contactName: "Marcus Lee",
    telephone: "0161 509 7700",
    postcode: "M50 2ST",
    businessType: "Data centre",
    fuelType: "Electricity",
    estimatedElectricityKwh: 1800000,
    estimatedGasKwh: null,
    currentSupplier: "TotalEnergies",
    contractEndDate: "2025-12-31",
    priority: "Critical",
    status: "Qualified",
    assignedAgent: "Jamie Cole",
    timeWaitingSeconds: 0,
    leadId: 2,
    demoExpectedRevenueGbp: 4200,
  },
  {
    id: "lt-005",
    businessName: "Urban Fitness Manchester",
    contactName: "Tom Hughes",
    telephone: "0161 244 9012",
    postcode: "M4 4BF",
    businessType: "Leisure",
    fuelType: "Gas",
    estimatedElectricityKwh: null,
    estimatedGasKwh: 68000,
    currentSupplier: "Yü Energy",
    contractEndDate: "2026-07-31",
    priority: "Low",
    status: "Quoted",
    assignedAgent: "Alex Morgan",
    timeWaitingSeconds: 0,
    leadId: null,
    demoExpectedRevenueGbp: 410,
  },
  {
    id: "lt-006",
    businessName: "Quick Stop News Ltd",
    contactName: "Aisha Khan",
    telephone: "0115 882 4410",
    postcode: "NG2 3AA",
    businessType: "Retail",
    fuelType: "Electricity",
    estimatedElectricityKwh: 42000,
    estimatedGasKwh: null,
    currentSupplier: "SSE Business Energy",
    contractEndDate: "2026-06-30",
    priority: "Medium",
    status: "Rejected",
    assignedAgent: "Sam Taylor",
    timeWaitingSeconds: 0,
    leadId: null,
    demoExpectedRevenueGbp: 0,
  },
  {
    id: "lt-007",
    businessName: "Fenland Agri Co-op",
    contactName: "David Moss",
    telephone: "01354 661200",
    postcode: "PE15 8XY",
    businessType: "Agriculture",
    fuelType: "Gas",
    estimatedElectricityKwh: null,
    estimatedGasKwh: 180000,
    currentSupplier: "Corona Energy",
    contractEndDate: "2026-10-20",
    priority: "High",
    status: "Waiting",
    assignedAgent: null,
    timeWaitingSeconds: 145,
    leadId: null,
    demoExpectedRevenueGbp: 720,
  },
];

const AGENTS: DemoTransferAgent[] = [
  {
    id: "a1",
    name: "Alex Morgan",
    status: "On call",
    currentCallDurationSeconds: 512,
    callsHandledToday: 14,
    qualifiedToday: 5,
    conversionsToday: 2,
    conversionRatePercent: 36,
    demoCommissionTodayGbp: 840,
  },
  {
    id: "a2",
    name: "Priya Shah",
    status: "On call",
    currentCallDurationSeconds: 203,
    callsHandledToday: 11,
    qualifiedToday: 4,
    conversionsToday: 2,
    conversionRatePercent: 42,
    demoCommissionTodayGbp: 920,
  },
  {
    id: "a3",
    name: "Jamie Cole",
    status: "Wrap-up",
    currentCallDurationSeconds: 45,
    callsHandledToday: 9,
    qualifiedToday: 3,
    conversionsToday: 1,
    conversionRatePercent: 31,
    demoCommissionTodayGbp: 560,
  },
  {
    id: "a4",
    name: "Sam Taylor",
    status: "Available",
    currentCallDurationSeconds: null,
    callsHandledToday: 7,
    qualifiedToday: 2,
    conversionsToday: 1,
    conversionRatePercent: 28,
    demoCommissionTodayGbp: 390,
  },
  {
    id: "a5",
    name: "Riley Brooks",
    status: "Break",
    currentCallDurationSeconds: null,
    callsHandledToday: 5,
    qualifiedToday: 1,
    conversionsToday: 0,
    conversionRatePercent: 0,
    demoCommissionTodayGbp: 0,
  },
];

const ACTIVITY: ActivityEvent[] = [
  {
    id: "ev-1",
    timestamp: "2026-07-28T14:52:00",
    business: "Peak Logistics Midlands",
    agent: "—",
    event: "Transfer entered queue",
    outcome: "Waiting",
  },
  {
    id: "ev-2",
    timestamp: "2026-07-28T14:48:00",
    business: "Harbour Dental Group",
    agent: "Alex Morgan",
    event: "Outbound dial started",
    outcome: "Calling",
  },
  {
    id: "ev-3",
    timestamp: "2026-07-28T14:41:00",
    business: "Cotswold Brew Co",
    agent: "Priya Shah",
    event: "Live connection established",
    outcome: "Connected",
  },
  {
    id: "ev-4",
    timestamp: "2026-07-28T14:35:00",
    business: "Fenland Agri Co-op",
    agent: "Jamie Cole",
    event: "Marked won (demo)",
    outcome: "Won",
  },
  {
    id: "ev-5",
    timestamp: "2026-07-28T14:22:00",
    business: "Quick Stop News Ltd",
    agent: "Sam Taylor",
    event: "Transfer rejected (demo)",
    outcome: "Rejected",
  },
];

export function getDemoTransfers(): DemoLiveTransfer[] {
  return TRANSFERS;
}

export function getDemoTransferAgents(): DemoTransferAgent[] {
  return AGENTS;
}

export function getDemoActivity(): ActivityEvent[] {
  return ACTIVITY;
}

export function formatWaitTime(seconds: number): string {
  if (seconds <= 0) {
    return "—";
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }

  return formatWaitTime(seconds);
}

export function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDisplayDate(date: string | null): string {
  if (!date) {
    return "Not configured";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatActivityTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function buildDemoKpis(
  transfers: DemoLiveTransfer[],
  agents: DemoTransferAgent[],
): LiveTransferKpis {
  const waiting = transfers.filter((t) => t.status === "Waiting");
  const waitTimes = waiting.map((t) => t.timeWaitingSeconds);
  const avgWait =
    waitTimes.length === 0
      ? 0
      : Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);

  const qualified = transfers.filter((t) =>
    ["Qualified", "Quoted", "Won"].includes(t.status),
  ).length;
  const conversions = agents.reduce((sum, a) => sum + a.conversionsToday, 0);
  const receivedToday = 18;
  const rate = Math.round((conversions / receivedToday) * 100);

  return {
    transfersWaiting: waiting.length,
    agentsAvailable: agents.filter((a) => a.status === "Available").length,
    averageWaitTimeLabel: avgWait === 0 ? "Not configured" : formatWaitTime(avgWait),
    transfersReceivedToday: receivedToday,
    qualifiedToday: qualified,
    conversionsToday: conversions,
    conversionRatePercent: rate,
    estimatedDemoRevenueTodayGbp: 6840,
  };
}

export { DEMO_AS_OF_DATE };
