import type { RenewalUrgencyBand } from "@/lib/renewals/types";

export type RenewalIntelligenceRow = {
  siteId: number;
  siteName: string;
  customerId: number;
  customerName: string;
  contactName: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contractEnd: string;
  contractEndLabel: string;
  daysRemaining: number;
  isOverdue: boolean;
  urgencyBand: RenewalUrgencyBand;
};

export type RenewalIntelligenceSummary = {
  overdueCount: number;
  within30Count: number;
  within60Count: number;
  within90Count: number;
  within180Count: number;
};

export type RenewalIntelligenceData = {
  configured: boolean;
  summary: RenewalIntelligenceSummary;
  rows: RenewalIntelligenceRow[];
};
