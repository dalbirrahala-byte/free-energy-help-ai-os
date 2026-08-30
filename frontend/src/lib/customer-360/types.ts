import { CUSTOMER_360_TABS } from "./constants";
import type { RenewalWorkflowLane } from "./renewal-workflow";

export type Customer360Tab = (typeof CUSTOMER_360_TABS)[number];

export type DataSource = "live" | "demo";

export type Customer360Header = {
  companyName: string;
  tradingStatus: string;
  primaryContact: string;
  telephone: string;
  email: string;
  accountManager: string;
  accountManagerSource: DataSource;
  currentSupplier: string;
  contractEndDate: string | null;
  contractEndLabel: string;
  renewalCountdownDays: number | null;
  renewalCountdownLabel: string;
  siteCount: number;
  customerSince: string;
  customerSinceLabel: string;
  riskStatus: string;
  aiOpportunityScore: string;
  expectedDemoCommission: string;
  sourceLeadId: number | null;
};

export type ExecutiveSummary = {
  activeContracts: string;
  sites: string;
  electricityMeters: string;
  gasMeters: string;
  openQuotes: string;
  tasksDue: string;
  renewalsDue: string;
  outstandingDemoCommission: string;
};

export type Customer360Alert = {
  id: string;
  type: string;
  message: string;
  source: DataSource;
  severity: "high" | "medium" | "low";
};

export type Site360Row = {
  id: number;
  source: "live";
  siteName: string;
  address: string;
  postcode: string;
  isPrimary: boolean;
  currentSupplier: string;
  contractEnd: string | null;
  contractEndLabel: string;
  electricityMeterCount: string;
  gasMeterCount: string;
  status: string;
};

export type Contract360Row = {
  id: string;
  source: "demo";
  supplier: string;
  fuelType: string;
  contractType: string;
  startDate: string;
  endDate: string;
  startLabel: string;
  endLabel: string;
  term: string;
  status: string;
  annualConsumption: string;
  estimatedAnnualValue: string;
  demoCommission: string;
  renewalWindow: string;
};

export type ElectricityMeterRow = {
  id: string;
  source: "demo";
  mpan: string;
  profileClass: string;
  meterSerial: string;
  hhNhh: string;
  currentSupplier: string;
  annualConsumption: string;
  status: string;
};

export type GasMeterRow = {
  id: string;
  source: "demo";
  mprn: string;
  meterSerial: string;
  aq: string;
  currentSupplier: string;
  status: string;
};

export type Consumption360 = {
  source: "demo";
  electricityAnnualKwh: string;
  gasAnnualKwh: string;
  monthlyTrend: { month: string; electricityPct: number; gasPct: number }[];
  peakUsage: string;
  estimatedAnnualSpend: string;
  alerts: string[];
};

export type Renewal360Row = {
  id: string;
  source: "demo";
  contractEndDate: string;
  contractEndLabel: string;
  daysRemaining: number;
  supplier: string;
  fuel: string;
  urgency: string;
  risk: string;
  recommendedAction: string;
  nextTask: string;
};

export type LiveTransfer360Row = {
  id: string;
  source: "demo";
  transferAt: string;
  sourceChannel: string;
  agent: string;
  outcome: string;
  waitTime: string;
  status: string;
  notes: string;
};

export type Quote360Row = {
  id: string;
  source: "demo";
  reference: string;
  supplier: string;
  fuel: string;
  contractTerm: string;
  annualValue: string;
  demoCommission: string;
  status: string;
  sentDate: string;
  expiryDate: string;
};

export type Commission360Row = {
  id: string;
  source: "demo";
  supplier: string;
  contract: string;
  expectedAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  status: string;
  expectedPaymentDate: string;
  actualPaymentDate: string;
};

export type Task360Row = {
  id: number;
  source: "live";
  title: string;
  type: string;
  dueDate: string | null;
  dueDateLabel: string;
  dueTime: string;
  priority: string;
  status: string;
  assignedUser: string;
};

export type Appointment360Row = {
  id: string;
  source: "demo";
  title: string;
  type: string;
  dueDate: string;
  dueTime: string;
  priority: string;
  status: string;
  assignedUser: string;
};

export type Document360Row = {
  id: string;
  source: "demo";
  name: string;
  docType: string;
  uploadedDate: string;
  uploadedBy: string;
  relatedTo: string;
  status: string;
};

export type Timeline360Entry = {
  id: string;
  source: DataSource;
  occurredAt: string;
  occurredLabel: string;
  category: string;
  summary: string;
};

export type AiRecommendation = {
  id: string;
  source: "demo";
  title: string;
  detail: string;
  priority: "High" | "Medium" | "Low";
};

export type DemoNoteHistoryEntry = {
  id: string;
  source: "demo";
  author: string;
  createdAt: string;
  body: string;
};

export type Contact360Row = {
  id: string;
  source: DataSource;
  name: string;
  role: string;
  telephone: string;
  email: string;
  isPrimary: boolean;
};

export type Activity360Row = {
  id: number;
  source: "live";
  activityType: string;
  title: string;
  details: string;
  occurredLabel: string;
};

export type Bill360Row = {
  id: string;
  source: "demo";
  reference: string;
  supplier: string;
  fuel: string;
  periodLabel: string;
  amount: string;
  status: string;
  receivedDate: string;
};

export type CreditStatus360 = {
  source: "demo";
  overallRating: string;
  creditLimit: string;
  exposure: string;
  paymentBehaviour: string;
  lastReviewLabel: string;
  nextReviewLabel: string;
  notes: string;
};

export type Opportunity360Row = {
  id: string;
  source: "demo";
  title: string;
  type: string;
  estimatedValue: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  owner: string;
  nextStep: string;
};

export type RenewalActionUrgency =
  | "Overdue"
  | "Critical"
  | "Priority"
  | "Upcoming"
  | "Future"
  | "Data gap";

export type DataGapWarning = {
  id: string;
  message: string;
};

export type RenewalActionWorkspace = {
  source: "live";
  companyName: string;
  primaryContact: string;
  telephone: string;
  email: string;
  primarySiteName: string;
  currentSupplier: string;
  contractEndLabel: string;
  renewalCountdownLabel: string;
  daysUntilEnd: number | null;
  urgency: RenewalActionUrgency;
  workflowLane: RenewalWorkflowLane;
  workflowReason: string;
  suggestedNextAction: string;
  suggestedNextActionReason: string;
  dataGaps: DataGapWarning[];
  openTaskCount: number;
  overdueTaskCount: number;
  latestActivitySummary: string;
};

export type Customer360Overview = {
  profileSummary: string;
  primarySiteName: string;
  primarySiteAddress: string;
  supplyPosition: string;
  latestActivitySummary: string;
  upcomingTasksSummary: string;
  renewalSummary: string;
  openQuoteSummary: string;
  commissionSummary: string;
};

export type Customer360DemoModules = {
  contracts: Contract360Row[];
  electricityMeters: ElectricityMeterRow[];
  gasMeters: GasMeterRow[];
  consumption: Consumption360;
  renewals: Renewal360Row[];
  liveTransfers: LiveTransfer360Row[];
  quotes: Quote360Row[];
  commissions: Commission360Row[];
  appointments: Appointment360Row[];
  documents: Document360Row[];
  bills: Bill360Row[];
  creditStatus: CreditStatus360;
  opportunities: Opportunity360Row[];
  additionalContacts: Contact360Row[];
  timelineDemo: Timeline360Entry[];
  aiRecommendations: AiRecommendation[];
  noteHistoryDemo: DemoNoteHistoryEntry[];
};

export type Customer360View = {
  customerId: number;
  header: Customer360Header;
  summary: ExecutiveSummary;
  alerts: Customer360Alert[];
  sites: Site360Row[];
  tasks: Task360Row[];
  contacts: Contact360Row[];
  activities: Activity360Row[];
  liveNotes: string | null;
  renewalAction: RenewalActionWorkspace;
  overview: Customer360Overview;
  demo: Customer360DemoModules;
  timeline: Timeline360Entry[];
};
