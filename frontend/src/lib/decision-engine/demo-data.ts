import { DEMO_DATA_SUFFIX, DEMO_EXECUTIVE_LABEL } from "./constants";
import { getDemoPriorityQueue } from "./recommendations";
import type {
  BusinessHealthModel,
  DecisionAuditRecord,
  ExecutiveSummary,
  OpportunityIntelligence,
  RiskIntelligence,
} from "./types";

export function getExecutiveSummary(): ExecutiveSummary {
  return {
    businessHealthScore: `72 / 100 (${DEMO_DATA_SUFFIX})`,
    opportunitiesRequiringAction: `18 (${DEMO_DATA_SUFFIX})`,
    estimatedDemoPipelineValue: `£1.2m (${DEMO_DATA_SUFFIX})`,
    estimatedDemoRevenueAtRisk: `£340k (${DEMO_DATA_SUFFIX})`,
    highPriorityRecommendations: `12 (${DEMO_DATA_SUFFIX})`,
    highRiskCustomers: `9 (${DEMO_DATA_SUFFIX})`,
    highRiskRenewals: `7 (${DEMO_DATA_SUFFIX})`,
    commissionRecoveryOpportunities: `5 (${DEMO_DATA_SUFFIX})`,
    supplierRisks: `4 (${DEMO_DATA_SUFFIX})`,
    dataQualityBlockers: `11 (${DEMO_DATA_SUFFIX})`,
  };
}

export function getBusinessHealthModel(): BusinessHealthModel {
  return {
    overallScore: 72,
    overallLabel: `72 — Stable with renewal concentration (${DEMO_DATA_SUFFIX})`,
    trend: "+3 pts vs last month (demo)",
    categoryScores: [
      { category: "Pipeline health", score: 68, label: "Demo analysis" },
      { category: "Quote conversion", score: 74, label: "Demo analysis" },
      { category: "Renewal retention", score: 65, label: "Demo analysis" },
      { category: "Commission collection", score: 70, label: "Demo analysis" },
      { category: "Supplier performance", score: 77, label: "Demo analysis" },
      { category: "Customer risk", score: 62, label: "Demo analysis" },
      { category: "Task completion", score: 71, label: "Demo analysis" },
      { category: "Data quality", score: 66, label: "Demo analysis" },
      { category: "Live-transfer performance", score: 80, label: "Demo analysis" },
      { category: "Account-manager workload", score: 58, label: "Demo analysis" },
    ],
    positiveContributors: ["Live-transfer SLA met (demo)", "Quote win rate up (demo)"],
    negativeContributors: ["July renewal cluster (demo)", "Commission delays (demo)"],
    missingData: ["2 HH profiles (demo)", "1 LOA pending (demo)"],
    confidence: "Medium confidence (demo)",
    recommendedManagementAction: "Focus AM capacity on July renewals (demo)",
  };
}

export function getOpportunityCards(): OpportunityIntelligence[] {
  const types = [
    "Lead conversion",
    "Quote conversion",
    "Renewal retention",
    "Commission recovery",
    "Multi-site consolidation",
    "Solar",
    "Battery",
    "EV charging",
    "Water",
    "Telecoms",
    "Merchant services",
    "Insurance",
    "Metering review",
    "kVA review",
    "MOP review",
    "DC review",
  ];
  return types.map((opportunityType, i) => ({
    id: `OPP-DEC-${i + 1}`,
    opportunityType,
    customer: i % 2 === 0 ? "Derby Manufacturing Ltd (demo)" : "Peak Logistics Group (demo)",
    estimatedDemoValue: `£${(i + 3) * 8}k (demo)`,
    probability: `${55 + (i % 30)}% (demo)`,
    probabilityScore: 55 + (i % 30),
    priority: i < 4 ? "High" : "Medium",
    evidence: "Decision rule match (demo)",
    recommendedAction: "Review with account manager (demo)",
    owner: "Alex Morgan (demo)",
    dueDate: "29 Jul 2026",
    status: "Open (demo)",
  }));
}

export function getRiskCards(): RiskIntelligence[] {
  const types = [
    "Customer churn",
    "Renewal loss",
    "Quote expiry",
    "Contract rejection",
    "Commission loss",
    "Supplier payment delay",
    "Supplier service failure",
    "Missing data",
    "No recent contact",
    "Overdue task",
    "Live-transfer abandonment",
    "Compliance placeholder",
  ];
  return types.map((riskType, i) => ({
    id: `RISK-DEC-${i + 1}`,
    riskType,
    severity: i < 4 ? "High" : i < 8 ? "Medium" : "Low",
    probability: `${40 + (i % 40)}% (demo)`,
    impact: i < 4 ? "High (demo)" : "Medium (demo)",
    evidence: "Scoring engine output (demo)",
    affectedRecords: `REC-DEMO-${200 + i}`,
    recommendedMitigation: "Execute NBA from queue (demo)",
    owner: "Jordan Lee (demo)",
    reviewDate: "30 Jul 2026",
    approvalRequirement: i % 3 === 0 ? "Required (demo)" : "Not required (demo)",
  }));
}

export function getDemoAuditLog(): DecisionAuditRecord[] {
  const queue = getDemoPriorityQueue();
  return queue.map((r, i) => ({
    decisionId: `DEC-AUD-${i + 1}`,
    recommendation: r.title,
    customer: r.customerId ?? "—",
    ruleVersion: "1.0.0-demo",
    contextVersion: "1.0.0-demo",
    score: r.priorityScore,
    confidence: r.confidence,
    approval: r.humanApprovalRequired ? "Required" : "—",
    outcome: "Demo pending",
    actor: "Decision engine (demo)",
    created: r.createdLabel,
    updated: r.updatedLabel,
    correlationId: r.correlationId,
  }));
}

export function getDirectorBriefing(): {
  opportunities: string[];
  risks: string[];
  sections: { title: string; items: string[] }[];
  priorities: string[];
} {
  return {
    opportunities: [
      "Derby Manufacturing renewal — £109k (demo)",
      "Peak Logistics commission recovery (demo)",
      "Multi-site consolidation — Riverside (demo)",
      "Solar suitability — Unit 4 (demo)",
      "Quote QTE-0147 conversion (demo)",
    ],
    risks: [
      "7 renewals within 14 days (demo)",
      "Commission overdue £8.2k (demo)",
      "9 customers no contact 30d (demo)",
      "Supplier SmartestEnergy payment delay (demo)",
      "Live transfer abandonment trend (demo)",
    ],
    sections: [
      { title: "Revenue protection actions", items: ["Call top 3 renewals (demo)", "Chase overdue commission (demo)"] },
      { title: "Growth actions", items: ["Solar desk review 2 accounts (demo)", "Water cross-sell pilot (demo)"] },
      { title: "Supplier actions", items: ["Review BGL service tickets (demo)"] },
      { title: "Staff-support actions", items: ["Rebalance AM workload (demo)"] },
      { title: "Data-quality actions", items: ["MPAN cleanup sprint (demo)"] },
      { title: "Commission recovery actions", items: ["Dispute playbook for COM-772 (demo)"] },
      { title: "Renewals requiring intervention", items: ["Derby Manufacturing — today (demo)"] },
    ],
    priorities: [
      "1. Secure Derby Manufacturing renewal (demo)",
      "2. Clear commission overdue queue (demo)",
      "3. Reduce live-transfer wait breaches (demo)",
      `${DEMO_EXECUTIVE_LABEL}`,
    ],
  };
}

export { getDemoPriorityQueue };
