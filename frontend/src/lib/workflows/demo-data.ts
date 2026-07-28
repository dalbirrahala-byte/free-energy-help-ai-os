import { APPROVAL_CATEGORIES } from "./constants";
import { createDemoWorkflowEvent } from "./events";
import type {
  ApprovalQueueItem,
  AuditTraceEntry,
  CustomerJourney,
  CustomerJourneyStage,
  IntegrationReadinessCard,
  NextBestActionRecommendation,
  WorkflowEvent,
  WorkflowException,
} from "./types";

const DEMO_CORR = "CORR-DEMO-JOURNEY-001";

function stage(
  key: CustomerJourneyStage["key"],
  label: string,
  partial: Partial<CustomerJourneyStage>,
): CustomerJourneyStage {
  return {
    key,
    label,
    status: partial.status ?? "Pending (demo)",
    completedAt: partial.completedAt ?? null,
    completedLabel: partial.completedLabel ?? "—",
    owner: partial.owner ?? "Unassigned (demo)",
    waitingTime: partial.waitingTime ?? "—",
    blocker: partial.blocker ?? null,
    nextAction: partial.nextAction ?? "—",
    dataCompleteness: partial.dataCompleteness ?? "Demo snapshot",
    humanApproval: partial.humanApproval ?? "Not required (demo)",
    recordLink: partial.recordLink ?? "Not configured",
  };
}

export function getDemoCustomerJourneys(): CustomerJourney[] {
  return [
    {
      journeyId: "JRN-DEMO-001",
      customerName: "Derby Manufacturing Ltd (demo)",
      correlationId: DEMO_CORR,
      stages: [
        stage("lead", "Lead", { status: "Completed (demo)", completedLabel: "12 Jun 2026, 09:15", owner: "Jordan Lee (demo)", nextAction: "—", dataCompleteness: "100% (demo)" }),
        stage("transfer", "Transfer", { status: "Completed (demo)", completedLabel: "28 Jul 2026, 10:02", owner: "Alex Morgan (demo)", waitingTime: "1m 12s (demo)" }),
        stage("qualification", "Qualification", { status: "Completed (demo)", completedLabel: "28 Jul 2026, 10:18", owner: "Alex Morgan (demo)" }),
        stage("quote", "Quote", { status: "In progress (demo)", owner: "Sam Patel (demo)", blocker: "Customer review (demo)", nextAction: "Chase quote QTE-0147", recordLink: "/quotes (demo)" }),
        stage("contract", "Contract", { status: "Waiting (demo)", nextAction: "Await quote acceptance" }),
        stage("onboarding", "Customer onboarding", { status: "Not started (demo)" }),
        stage("renewal", "Renewal", { status: "Window open (demo)", nextAction: "Risk assessment", dataCompleteness: "82% (demo)" }),
        stage("commission", "Commission", { status: "Forecast (demo)", owner: "Finance (demo)" }),
        stage("retention", "Retention", { status: "Monitoring (demo)", humanApproval: "Required for outreach (demo)" }),
      ],
    },
  ];
}

export function getDemoEventStream(): WorkflowEvent[] {
  const corr = DEMO_CORR;
  return [
    createDemoWorkflowEvent({
      eventType: "Lead created",
      businessArea: "Lead",
      recordType: "Lead",
      recordId: "LEAD-DEMO-8842",
      customerId: null,
      correlationId: corr,
      status: "Completed",
      actor: "Jordan Lee (demo)",
      source: "Web form (demo)",
      timestamp: "2026-06-12T08:15:00.000Z",
      metadata: { customerName: "Derby Manufacturing Ltd (demo)" },
    }),
    createDemoWorkflowEvent({
      eventType: "Transfer received",
      businessArea: "Live transfer",
      recordType: "Transfer",
      recordId: "XFR-DEMO-2201",
      correlationId: corr,
      parentEventId: "WF-EVT-DEMO-00001",
      status: "Completed",
      actor: "Queue (demo)",
      source: "Live Transfers (demo)",
      timestamp: "2026-07-28T09:02:00.000Z",
      priority: "High",
      metadata: { customerName: "Derby Manufacturing Ltd (demo)" },
    }),
    createDemoWorkflowEvent({
      eventType: "Quote sent",
      businessArea: "Quote",
      recordType: "Quote",
      recordId: "QTE-2026-0147",
      customerId: "CUST-DEMO-001",
      correlationId: corr,
      status: "Completed",
      actor: "Sam Patel (demo)",
      source: "Quote Engine (demo)",
      timestamp: "2026-07-27T15:40:00.000Z",
      humanApprovalRequired: true,
      metadata: { customerName: "Derby Manufacturing Ltd (demo)" },
    }),
    createDemoWorkflowEvent({
      eventType: "Renewal window opened",
      businessArea: "Renewal",
      recordType: "Contract",
      recordId: "CTR-DEMO-991",
      customerId: "CUST-DEMO-001",
      correlationId: corr,
      status: "Processing",
      actor: "Renewals engine (demo)",
      source: "Renewals Intelligence (demo)",
      timestamp: "2026-07-28T07:00:00.000Z",
      riskLevel: "High",
      metadata: { customerName: "Derby Manufacturing Ltd (demo)" },
    }),
    createDemoWorkflowEvent({
      eventType: "AI recommendation created",
      businessArea: "AI",
      recordType: "Recommendation",
      recordId: "AI-REC-DEMO-44",
      customerId: "CUST-DEMO-001",
      correlationId: corr,
      status: "Waiting for approval",
      actor: "AI Sales Assistant (demo)",
      source: "AI module (not connected)",
      timestamp: "2026-07-28T14:05:00.000Z",
      humanApprovalRequired: true,
      confidenceLevel: "Medium confidence",
      metadata: { customerName: "Derby Manufacturing Ltd (demo)" },
    }),
    createDemoWorkflowEvent({
      eventType: "Commission overdue",
      businessArea: "Commission",
      recordType: "Commission",
      recordId: "COM-DEMO-772",
      customerId: "CUST-DEMO-002",
      correlationId: "CORR-DEMO-COM-002",
      status: "Failed",
      actor: "Reconciliation (demo)",
      source: "Commission Intelligence (demo)",
      timestamp: "2026-07-28T06:30:00.000Z",
      priority: "High",
      riskLevel: "Medium",
      metadata: { customerName: "Peak Logistics Group (demo)" },
    }),
    createDemoWorkflowEvent({
      eventType: "Task overdue",
      businessArea: "Task",
      recordType: "Task",
      recordId: "TSK-DEMO-118",
      customerId: "CUST-DEMO-001",
      correlationId: corr,
      status: "Queued",
      actor: "Task register (demo)",
      source: "Tasks (demo)",
      timestamp: "2026-07-28T08:00:00.000Z",
      metadata: { customerName: "Derby Manufacturing Ltd (demo)" },
    }),
  ];
}

export function getDemoApprovalQueue(): ApprovalQueueItem[] {
  return APPROVAL_CATEGORIES.map((category, i) => ({
    id: `APR-DEMO-${i + 1}`,
    category,
    requestedAction: `Demo ${category.toLowerCase()} action`,
    businessReason: "Workflow rule matched — demonstration only",
    recordLabel: i % 2 === 0 ? "Derby Manufacturing Ltd" : "QTE-2026-0147",
    risk: i % 3 === 0 ? "High" : "Medium",
    financialImpact: "£0 — demo placeholder",
    requestedBy: "Workflow intelligence (demo)",
    requestedAt: "28 Jul 2026, 14:22",
    evidence: "Event stream + rule BR-DEMO (demo)",
  }));
}

export function getDemoExceptions(): WorkflowException[] {
  const types = [
    "Missing customer",
    "Missing site",
    "Missing MPAN",
    "Missing MPRN",
    "Missing contract end date",
    "Missing annual consumption",
    "Missing supplier",
    "Missing account manager",
    "Duplicate record",
    "Workflow timeout",
    "Approval expired",
    "External integration unavailable",
    "AI confidence too low",
    "Financial data mismatch",
  ];
  return types.map((type, i) => ({
    id: `EX-DEMO-${i + 1}`,
    type,
    severity: i < 4 ? "High" : i < 9 ? "Medium" : "Low",
    affectedWorkflow: CORE_WORKFLOW_NAMES[i % CORE_WORKFLOW_NAMES.length],
    record: `REC-DEMO-${1000 + i}`,
    rootCause: "Demonstration scenario — incomplete demo register",
    recommendedAction: "Correct data or request approval (demo)",
    owner: "Alex Morgan (demo)",
    age: `${1 + (i % 5)}d (demo)`,
    status: "Open (demo)",
  }));
}

const CORE_WORKFLOW_NAMES = [
  "Lead-to-customer workflow",
  "Quote-to-contract workflow",
  "Renewal workflow",
  "Commission reconciliation workflow",
  "Customer-risk workflow",
];

export function getDemoNextBestActions(): NextBestActionRecommendation[] {
  const actions = [
    "Call customer today",
    "Request latest bill",
    "Request LOA",
    "Start tender",
    "Review supplier options",
    "Review consumption",
    "Create quote",
    "Chase quote",
    "Review contract paperwork",
    "Escalate renewal",
    "Chase commission",
    "Review supplier performance",
    "Assign account manager",
    "Correct missing data",
    "Request human approval",
  ];
  return actions.map((action, i) => ({
    id: `NBA-DEMO-${i + 1}`,
    action,
    reason: "Rule engine match (demo)",
    evidence: "Event CORR-DEMO-JOURNEY-001",
    priority: i < 3 ? "Critical" : "High",
    confidence: "Medium confidence (demo)",
    expectedOutcome: "Progress journey stage (demo)",
    estimatedDemoValue: `£${(i + 2) * 5}k (demo)`,
    owner: "Alex Morgan (demo)",
    approvalRequired: i % 4 === 0,
    sourceWorkflow: CORE_WORKFLOW_NAMES[i % CORE_WORKFLOW_NAMES.length],
  }));
}

export function getDemoAuditTrace(correlationId: string): AuditTraceEntry[] {
  return [
    {
      id: "AUD-1",
      timestamp: "2026-07-28T09:02:00.000Z",
      timestampLabel: "28 Jul 2026, 10:02",
      eventHistory: "Transfer received",
      workflowVersion: "WF-LT-001 v1.0.0-demo",
      ruleUsed: "LIVE_TRANSFER_WAIT_SECONDS",
      inputData: "Queue wait 72s (demo)",
      decision: "Assign agent Alex Morgan",
      approval: "Not required (demo)",
      result: "Transfer connected",
      error: null,
      retry: "0",
      actor: "Workflow engine (demo)",
      correlationId,
    },
    {
      id: "AUD-2",
      timestamp: "2026-07-28T14:05:00.000Z",
      timestampLabel: "28 Jul 2026, 15:05",
      eventHistory: "AI recommendation created",
      workflowVersion: "WF-RISK-001 v1.0.0-demo",
      ruleUsed: "NO_CONTACT_CUSTOMER_DAYS",
      inputData: "Last contact 31 days (demo)",
      decision: "Create AI recommendation",
      approval: "Pending",
      result: "Waiting for approval",
      error: null,
      retry: "0",
      actor: "AI Sales Assistant (demo)",
      correlationId,
    },
  ];
}

export function getDemoIntegrations(): IntegrationReadinessCard[] {
  return [
    { id: "int-1", name: "Supabase event source", status: "Architecture ready", notes: "Read-only demo — not connected" },
    { id: "int-2", name: "n8n executor", status: "Not connected", notes: "Planned orchestration layer" },
    { id: "int-3", name: "OpenAI reasoning", status: "Not connected", notes: "AI module preview only" },
    { id: "int-4", name: "Email delivery", status: "Configuration required", notes: "SMTP/API TBC" },
    { id: "int-5", name: "Microsoft 365", status: "Planned", notes: "Calendar and mail" },
    { id: "int-6", name: "Gmail", status: "Not connected", notes: "OAuth pending" },
    { id: "int-7", name: "Twilio", status: "Not connected", notes: "Telephony disabled" },
    { id: "int-8", name: "WhatsApp", status: "Planned", notes: "Business API" },
    { id: "int-9", name: "DocuSign", status: "Development required", notes: "Contract signatures" },
    { id: "int-10", name: "Companies House", status: "Configuration required", notes: "KYC enrichment" },
    { id: "int-11", name: "Supplier APIs", status: "Development required", notes: "Per-supplier adapters" },
    { id: "int-12", name: "Webhooks", status: "Architecture ready", notes: "No production endpoints" },
    { id: "int-13", name: "Audit storage", status: "Architecture ready", notes: "Append-only design (demo)" },
  ];
}

export function getActiveDemoWorkflowRows(): { id: string; name: string; status: string; owner: string; lastEvent: string }[] {
  return [
    { id: "WF-L2C-001", name: "Lead-to-customer", status: "Active in demonstration", owner: "Sales ops (demo)", lastEvent: "Lead qualified (demo)" },
    { id: "WF-LT-001", name: "Live-transfer conversion", status: "Active in demonstration", owner: "Live transfers (demo)", lastEvent: "Transfer connected (demo)" },
    { id: "WF-Q2C-001", name: "Quote-to-contract", status: "Active in demonstration", owner: "Quote desk (demo)", lastEvent: "Quote sent (demo)" },
    { id: "WF-COB-001", name: "Contract onboarding", status: "Ready", owner: "Operations (demo)", lastEvent: "—" },
    { id: "WF-REN-001", name: "Renewal", status: "Active in demonstration", owner: "Renewals (demo)", lastEvent: "Window opened (demo)" },
    { id: "WF-COM-001", name: "Commission reconciliation", status: "Active in demonstration", owner: "Finance (demo)", lastEvent: "Overdue flagged (demo)" },
    { id: "WF-RISK-001", name: "Customer-risk", status: "Active in demonstration", owner: "CS (demo)", lastEvent: "AI recommendation (demo)" },
  ];
}
