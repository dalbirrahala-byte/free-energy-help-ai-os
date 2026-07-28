export const TRANSFER_STATUS_VALUES = [
  "Waiting",
  "Calling",
  "Connected",
  "Qualified",
  "Quoted",
  "Won",
  "Lost",
  "Rejected",
] as const;

export type TransferStatus = (typeof TRANSFER_STATUS_VALUES)[number];

export const PRIORITY_VALUES = ["Critical", "High", "Medium", "Low"] as const;

export type TransferPriority = (typeof PRIORITY_VALUES)[number];

export type FuelType = "Electricity" | "Gas" | "Dual fuel" | "Unknown";

export const AGENT_STATUS_VALUES = [
  "Available",
  "On call",
  "Wrap-up",
  "Break",
  "Offline",
] as const;

export type AgentStatus = (typeof AGENT_STATUS_VALUES)[number];

export type DemoLiveTransfer = {
  id: string;
  businessName: string;
  contactName: string;
  telephone: string;
  postcode: string;
  businessType: string;
  fuelType: FuelType;
  estimatedElectricityKwh: number | null;
  estimatedGasKwh: number | null;
  currentSupplier: string;
  contractEndDate: string | null;
  priority: TransferPriority;
  status: TransferStatus;
  assignedAgent: string | null;
  timeWaitingSeconds: number;
  leadId: number | null;
  demoExpectedRevenueGbp: number;
};

export type DemoTransferAgent = {
  id: string;
  name: string;
  status: AgentStatus;
  currentCallDurationSeconds: number | null;
  callsHandledToday: number;
  qualifiedToday: number;
  conversionsToday: number;
  conversionRatePercent: number;
  demoCommissionTodayGbp: number;
};

export type LiveTransferKpis = {
  transfersWaiting: number;
  agentsAvailable: number;
  averageWaitTimeLabel: string;
  transfersReceivedToday: number;
  qualifiedToday: number;
  conversionsToday: number;
  conversionRatePercent: number;
  estimatedDemoRevenueTodayGbp: number;
};

export type UrgencyBucket = "under_30s" | "30_60s" | "1_2m" | "over_2m";

export type UrgencyGroup = {
  bucket: UrgencyBucket;
  label: string;
  count: number;
  heat: "green" | "amber" | "red";
};

export type ActivityEvent = {
  id: string;
  timestamp: string;
  business: string;
  agent: string;
  event: string;
  outcome: TransferStatus;
};

export type LiveTransferFilterState = {
  status: string;
  priority: string;
  fuelType: string;
  assignedAgent: string;
  waitingBucket: string;
  query: string;
};

export const DEMO_DATA_LABEL =
  "Demonstration data only — not connected to live telephony or CRM feeds.";
