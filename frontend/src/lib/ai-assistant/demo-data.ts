import type {
  AgentRole,
  BriefingItem,
  CallPrepDemo,
  ConversationMessage,
  CustomerSummaryDemo,
  DirectorBriefing,
  EmailDraftDemo,
  NextBestAction,
  OpportunityCard,
  QuoteReviewFinding,
  ResponseConfidence,
  RiskItem,
} from "./types";

export function getDailyBriefing(): BriefingItem[] {
  return [
    { id: "b1", category: "Renewals", text: "Derby Manufacturing — £109k EACV, 0 days to end (demo)" },
    { id: "b2", category: "Quotes", text: "QTE-2026-0147 awaiting customer response (demo)" },
    { id: "b3", category: "Contracts", text: "3 contracts within 30 days — paperwork check (demo)" },
    { id: "b4", category: "Commission", text: "£8,200 overdue across 2 suppliers (demo)" },
    { id: "b5", category: "Live transfers", text: "2 transfers over 3 min wait (demo)" },
    { id: "b6", category: "Customers", text: "9 accounts without contact in 30 days (demo)" },
    { id: "b7", category: "Tasks", text: "11 overdue tasks (demo)" },
    { id: "b8", category: "Suppliers", text: "SmartestEnergy under review (demo)" },
    { id: "b9", category: "Data quality", text: "2 sites missing HH data (demo)" },
    { id: "b10", category: "Priorities", text: "1) Call Derby Mfg 2) Chase QTE-0147 3) Commission review (demo)" },
  ];
}

export function getCustomerSummary(): CustomerSummaryDemo {
  return {
    customer: "Derby Manufacturing Ltd (demo)",
    profile: "Industrial HH — Active (demo)",
    sites: "2 sites — Riverside primary (demo)",
    contracts: "1 live electricity, 1 gas renewal due (demo)",
    meters: "1 HH MPAN, 1 gas MPRN (demo)",
    annualConsumption: "600,000 kWh combined (demo)",
    currentSupplier: "EDF Energy / BGLite (demo)",
    contractEnd: "28 Jul 2026 (demo)",
    renewalPosition: "Critical — end date today in demo register",
    quoteHistory: "QTE-2026-0147 sent — negotiating (demo)",
    commissionPosition: "£4,860 expected, £0 paid (demo)",
    recentContact: "Live transfer 28 Jul 2026 (demo)",
    openTasks: "Renewal review call (demo)",
    risks: "Expiry without signed renewal (demo)",
    opportunities: "Multi-site consolidation review (demo)",
    suggestedNextAction: "Call primary contact — demo recommendation",
  };
}

export function getCallPrep(): CallPrepDemo {
  return {
    customer: "Derby Manufacturing Ltd (demo)",
    overview: "Dual-fuel industrial account — HH profile (demo)",
    objective: "Secure renewal intent and book pricing review (demo)",
    recentHistory: "Viewed quote online 25 Jul; transfer 28 Jul (demo)",
    objections: "Price vs incumbent; HH pass-through clarity (demo)",
    supplier: "EDF Electricity (demo)",
    consumption: "420,000 kWh elec annual (demo)",
    contractEnd: "28 Jul 2026 (demo)",
    renewalProbability: "62% (demo model)",
    openingStatement: "Hi Sarah — calling about your Riverside supply ending this week… (demo)",
    questions: [
      "Has the board approved renewal budget? (demo)",
      "Any site changes affecting consumption? (demo)",
      "Preferred contract length? (demo)",
    ],
    risksToAvoid: ["Do not quote without LOA on file (demo)", "Avoid promising live prices (demo)"],
    nextStep: "Send revised 36-month option after internal review (demo)",
  };
}

export function getEmailDrafts(): EmailDraftDemo[] {
  const base = {
    recipient: "customer.contact@example (demo)",
    approval: "Required before send",
    integration: "Gmail — Not connected",
    status: "Draft (demo)",
  };
  return [
    { id: "e1", type: "Renewal email", subject: "Your energy contract renewal — Derby Manufacturing", body: "Dear Sarah, … (demo draft)", tone: "Professional", purpose: "Renewal engagement", ...base },
    { id: "e2", type: "Welcome email", subject: "Welcome to Free Energy Help", body: "Thank you for choosing… (demo)", tone: "Warm", purpose: "Onboarding", ...base },
    { id: "e3", type: "Quote follow-up", subject: "Quote QTE-2026-0147 — questions?", body: "Following up on your quote… (demo)", tone: "Consultative", purpose: "Quote chase", ...base },
    { id: "e4", type: "Missing-information request", subject: "Information required to progress your quote", body: "Please provide… (demo)", tone: "Clear", purpose: "Data collection", ...base },
    { id: "e5", type: "Commission chase", subject: "Commission statement query — demo ref", body: "Dear supplier desk… (demo)", tone: "Firm", purpose: "Supplier chase", recipient: "supplier.demo@example", approval: "Internal only", integration: "Email — Not connected", status: "Draft (demo)" },
    { id: "e6", type: "Supplier escalation", subject: "Escalation — service issue ref (demo)", body: "Escalating… (demo)", tone: "Formal", purpose: "Escalation", ...base },
    { id: "e7", type: "Appointment confirmation", subject: "Appointment confirmed — demo", body: "We confirm… (demo)", tone: "Professional", purpose: "Scheduling", ...base },
    { id: "e8", type: "Lost-customer recovery", subject: "Can we help with your next renewal?", body: "We noticed… (demo)", tone: "Conciliatory", purpose: "Win-back", ...base },
  ];
}

export function getQuoteReviewFindings(): QuoteReviewFinding[] {
  return [
    { id: "qr1", finding: "Missing MPAN or MPRN", detail: "Gas MPRN verified; elec OK (demo)" },
    { id: "qr2", finding: "Missing contract end date", detail: "Present on primary site (demo)" },
    { id: "qr3", finding: "Missing annual consumption", detail: "HH profile attached (demo)" },
    { id: "qr4", finding: "Margin warning", detail: "18.5% within band (demo)" },
    { id: "qr5", finding: "Unusual standing charge", detail: "Within tolerance (demo)" },
    { id: "qr6", finding: "Unusual unit rate", detail: "Review flagged — none (demo)" },
    { id: "qr7", finding: "Missing supplier option", detail: "4 suppliers in matrix (demo)" },
    { id: "qr8", finding: "Missing commission value", detail: "£4,860 shown (demo)" },
    { id: "qr9", finding: "Quote expiry risk", detail: "Expires 15 Aug 2026 (demo)" },
    { id: "qr10", finding: "Customer suitability", detail: "Suitable for fixed 36m (demo)" },
    { id: "qr11", finding: "Recommended supplier", detail: "EDF Energy row #1 (demo)" },
    { id: "qr12", finding: "Suggested contract term", detail: "36 months (demo)" },
  ];
}

export function getOpportunities(): OpportunityCard[] {
  const types = [
    "Electricity renewal",
    "Gas renewal",
    "Multi-site consolidation",
    "Solar",
    "Battery storage",
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
  return types.map((type, i) => ({
    id: `opp-${i}`,
    customer: i % 2 === 0 ? "Derby Manufacturing Ltd" : "Peak Logistics Group",
    type: `${type} (demo)`,
    estimatedValue: `£${(5 + i) * 3}k (demo)`,
    confidence: i % 3 === 0 ? "High (demo)" : "Medium (demo)",
    evidence: "Demo register match",
    action: "Create task placeholder (demo)",
    owner: "Alex Morgan (demo)",
    status: "Open (demo)",
  }));
}

export function getNextBestActions(): NextBestAction[] {
  return [
    { id: "nba1", action: "Call customer", reason: "Contract end today (demo)" },
    { id: "nba2", action: "Create task", reason: "Renewal pack incomplete (demo)" },
    { id: "nba3", action: "Draft email", reason: "Quote follow-up due (demo)" },
    { id: "nba4", action: "Request bill", reason: "Validate consumption (demo)" },
    { id: "nba5", action: "Request LOA", reason: "Pending signature (demo)" },
    { id: "nba6", action: "Review quote", reason: "Margin check (demo)" },
    { id: "nba7", action: "Start tender", reason: "90-day window (demo)" },
    { id: "nba8", action: "Chase supplier", reason: "Commission overdue (demo)" },
    { id: "nba9", action: "Escalate commission", reason: "Dispute open (demo)" },
    { id: "nba10", action: "Book appointment", reason: "Site visit preferred (demo)" },
    { id: "nba11", action: "Update missing data", reason: "MPAN format (demo)" },
    { id: "nba12", action: "Review contract", reason: "Paperwork gap (demo)" },
    { id: "nba13", action: "Review meter information", reason: "HH gap (demo)" },
  ];
}

export function getRiskItems(): RiskItem[] {
  return [
    { id: "r1", type: "Customer churn risk", severity: "High", evidence: "No renewal signed (demo)", action: "Call customer", owner: "Alex Morgan (demo)", reviewDate: "28 Jul 2026 (demo)" },
    { id: "r2", type: "Renewal risk", severity: "High", evidence: "7 overdue renewals (demo)", action: "Daily digest", owner: "Jordan Lee (demo)", reviewDate: "29 Jul 2026 (demo)" },
    { id: "r3", type: "Quote expiry risk", severity: "Medium", evidence: "6 quotes expiring (demo)", action: "Chase quotes", owner: "Sam Patel (demo)", reviewDate: "30 Jul 2026 (demo)" },
    { id: "r4", type: "Contract rejection risk", severity: "Low", evidence: "1 pending signature (demo)", action: "Review LOA", owner: "Alex Morgan (demo)", reviewDate: "01 Aug 2026 (demo)" },
    { id: "r5", type: "Commission risk", severity: "Medium", evidence: "£8.2k overdue (demo)", action: "Supplier chase", owner: "Alex Morgan (demo)", reviewDate: "28 Jul 2026 (demo)" },
    { id: "r6", type: "Supplier service risk", severity: "Medium", evidence: "BGL complaints up (demo)", action: "Service review", owner: "Sam Patel (demo)", reviewDate: "05 Aug 2026 (demo)" },
    { id: "r7", type: "Missing-data risk", severity: "Low", evidence: "2 HH gaps (demo)", action: "Data task", owner: "Platform (demo)", reviewDate: "Weekly (demo)" },
    { id: "r8", type: "No-contact risk", severity: "Medium", evidence: "9 accounts (demo)", action: "Outreach campaign", owner: "Jordan Lee (demo)", reviewDate: "29 Jul 2026 (demo)" },
    { id: "r9", type: "Task-overdue risk", severity: "High", evidence: "11 tasks (demo)", action: "AM stand-up", owner: "All AMs (demo)", reviewDate: "Daily (demo)" },
    { id: "r10", type: "Compliance risk", severity: "Low", evidence: "Placeholder — not configured", action: "Compliance review TBC", owner: "Director (demo)", reviewDate: "Q3 (demo)" },
  ];
}

export function getDirectorBriefing(): DirectorBriefing {
  return {
    health: "Stable with renewal concentration risk (demo executive insight)",
    revenueTrend: "Monthly demo index +4.2% vs prior month",
    commissionExposure: "£43,600 outstanding (demo)",
    renewalPipeline: "41 contracts in 90-day window (demo)",
    salesConversion: "38.6% quote win rate (demo)",
    accountManagerPerformance: "Alex Morgan leading conversion (demo)",
    supplierConcerns: "Payment delays — SmartestEnergy (demo)",
    customerRisks: "12 at-risk accounts flagged (demo)",
    bottlenecks: "Quote desk approval queue (demo)",
    managementActions: "Focus on July renewals + commission chase (demo)",
  };
}

export function getAgents(): AgentRole[] {
  const roles = [
    "Sales Assistant",
    "Renewal Assistant",
    "Quote Reviewer",
    "Contract Analyst",
    "Commission Analyst",
    "Supplier Analyst",
    "Customer Success Assistant",
    "Director Briefing Assistant",
    "Data Quality Assistant",
    "Call Preparation Assistant",
  ];
  return roles.map((role, i) => ({
    id: `agent-${i}`,
    role,
    status: i < 3 ? "Ready (demo)" : "Not connected",
    purpose: `Support ${role.toLowerCase()} workflows (demo)`,
    dataRequired: "CRM + module demo registers",
    allowedActions: "Draft text, Suggest tasks (demo)",
    blockedActions: "Send email, Submit contracts, Pay commission",
    approval: "Required for customer-facing output",
    integration: "OpenAI — Not connected",
  }));
}

export function getResponseConfidence(): ResponseConfidence {
  return {
    level: "Medium confidence",
    dataCompleteness: "72% — demo modules only",
    sourceModules: "Customer 360, Quotes, Renewals, Commission (demo)",
    lastRefresh: "Not configured — static demo snapshot",
    humanApproval: "Required before customer communications",
    integrationStatus: "Not connected",
  };
}

export function getDemoConversation(): ConversationMessage[] {
  return [
    { id: "m1", role: "user", content: "Summarise Derby Manufacturing for today", demo: true },
    {
      id: "m2",
      role: "assistant",
      content:
        "Demo response: Dual-fuel industrial customer, renewal due, quote QTE-0147 negotiating. Suggested priority call. (Not connected to a live model.)",
      demo: true,
    },
  ];
}

export function getEvidenceSources(): string[] {
  return [
    "Customer 360 demo profile",
    "Quote Engine QTE-2026-0147",
    "Renewals Intelligence register",
    "Commission Intelligence outstanding row",
    "Live Transfers queue (demo)",
  ];
}
