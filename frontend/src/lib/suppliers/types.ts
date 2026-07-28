import {
  MARKET_SEGMENTS,
  SECTOR_APPETITE_LEVELS,
  SECTORS,
  SUPPLIER_RISK_LEVELS,
  SUPPLIER_STATUSES,
} from "./constants";

export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export type SupplierRiskLevel = (typeof SUPPLIER_RISK_LEVELS)[number];

export type SectorAppetiteLevel = (typeof SECTOR_APPETITE_LEVELS)[number];

export type MarketSegment = (typeof MARKET_SEGMENTS)[number];

export type Sector = (typeof SECTORS)[number];

export type DemoSupplierRecord = {
  id: string;
  name: string;
  category: string;
  status: SupplierStatus;
  preferred: boolean;
  electricityAvailable: boolean;
  gasAvailable: boolean;
  smeAppetite: string;
  corporateAppetite: string;
  multiSiteAppetite: string;
  renewableOptions: string;
  avgQuoteTurnaround: string;
  quoteAcceptanceRate: string;
  contractSuccessRate: string;
  avgCommissionRate: string;
  avgPaymentDays: string;
  serviceRating: string;
  riskRating: SupplierRiskLevel;
  lastReviewed: string;
  marketSegment: MarketSegment;
  preferredSectors: string;
  winRate: string;
  openDisputes: string;
  accountOwner: string;
  fuelFilter: "Electricity" | "Gas" | "Dual";
  sectorAppetite: Record<Sector, SectorAppetiteLevel>;
  performance: DemoSupplierPerformance;
  commission: DemoSupplierCommission;
  service: DemoSupplierService;
  notes: DemoSupplierNotes;
};

export type DemoSupplierPerformance = {
  quotesSubmitted: string;
  quotesReturned: string;
  quotesAccepted: string;
  contractsSubmitted: string;
  contractsLive: string;
  contractsRejected: string;
  renewalsRetained: string;
  renewalsLost: string;
  avgContractTerm: string;
  avgAnnualConsumption: string;
  complaintLevel: string;
  renewalSuccess: string;
  paymentSpeedScore: string;
};

export type DemoSupplierCommission = {
  expectedCommission: string;
  paidCommission: string;
  outstandingCommission: string;
  avgPaymentDays: string;
  latePayments: string;
  disputedCommission: string;
  reconciliationRequired: string;
  commissionRiskLevel: SupplierRiskLevel;
};

export type DemoSupplierService = {
  accountManager: string;
  escalationContact: string;
  quoteDesk: string;
  contractSupport: string;
  meteringSupport: string;
  complaintsContact: string;
  avgResponseTime: string;
  lastServiceIssue: string;
  openServiceCases: string;
};

export type DemoSupplierNotes = {
  internalNotes: string;
  lastReview: string;
  reviewedBy: string;
  nextReview: string;
  serviceConcerns: string;
  pricingConcerns: string;
  commissionConcerns: string;
  appetiteChanges: string;
  recommendedAction: string;
};

export type SupplierFilterState = {
  query: string;
  fuelType: string;
  marketSegment: string;
  status: string;
  riskLevel: string;
  preferredOnly: string;
  renewableOptions: string;
  sectorAppetite: string;
  quoteTurnaround: string;
  accountOwner: string;
};

export type SupplierExecutiveKpis = {
  activeSuppliers: string;
  preferredSuppliers: string;
  quotesThisMonth: string;
  avgQuoteTurnaround: string;
  avgAcceptanceRate: string;
  avgPaymentTime: string;
  commissionOutstanding: string;
  suppliersRequiringReview: string;
};

export type DemoSupplierAiRecommendation = {
  id: string;
  title: string;
  detail: string;
  supplierId?: string;
};

export type PerformanceComparisonMetric = {
  id: string;
  label: string;
  suppliers: { supplierId: string; name: string; value: number; display: string }[];
};
