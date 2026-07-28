/** Shared business event type catalogue — demonstration definitions only. */

export const LEAD_EVENTS = [
  "Lead created",
  "Lead assigned",
  "Lead contacted",
  "Lead qualified",
  "Lead disqualified",
  "Lead converted",
  "Lead inactive",
  "Lead escalated",
] as const;

export const LIVE_TRANSFER_EVENTS = [
  "Transfer received",
  "Transfer waiting",
  "Transfer accepted",
  "Transfer connected",
  "Transfer qualified",
  "Transfer rejected",
  "Transfer missed",
  "Transfer converted",
] as const;

export const CUSTOMER_EVENTS = [
  "Customer created",
  "Customer updated",
  "Customer inactive",
  "Customer at risk",
  "Customer information incomplete",
  "Customer reactivated",
] as const;

export const SITE_EVENTS = [
  "Site created",
  "Site updated",
  "Meter information incomplete",
  "Supplier changed",
  "Consumption updated",
  "Additional site identified",
] as const;

export const QUOTE_EVENTS = [
  "Quote created",
  "Pricing requested",
  "Pricing received",
  "Quote reviewed",
  "Quote sent",
  "Quote viewed",
  "Quote accepted",
  "Quote rejected",
  "Quote expired",
  "Quote cloned",
] as const;

export const CONTRACT_EVENTS = [
  "Contract created",
  "Contract submitted",
  "Contract pending signature",
  "Contract accepted",
  "Contract rejected",
  "Contract live",
  "Contract terminated",
  "Contract expired",
  "Contract paperwork incomplete",
] as const;

export const RENEWAL_EVENTS = [
  "Renewal window opened",
  "Renewal task created",
  "Renewal escalated",
  "Renewal quote created",
  "Renewal won",
  "Renewal lost",
  "Contract moved out of contract",
] as const;

export const COMMISSION_EVENTS = [
  "Commission forecast created",
  "Commission expected",
  "Commission invoiced",
  "Commission part paid",
  "Commission paid",
  "Commission overdue",
  "Commission underpaid",
  "Commission disputed",
  "Commission reconciled",
] as const;

export const SUPPLIER_EVENTS = [
  "Supplier appetite changed",
  "Supplier performance changed",
  "Supplier payment delayed",
  "Supplier placed under review",
  "Supplier service issue created",
  "Supplier recommendation updated",
] as const;

export const TASK_EVENTS = [
  "Task created",
  "Task assigned",
  "Task due",
  "Task overdue",
  "Task completed",
  "Task escalated",
  "Task cancelled",
] as const;

export const AI_EVENTS = [
  "AI recommendation created",
  "AI recommendation approved",
  "AI recommendation rejected",
  "AI draft created",
  "AI risk identified",
  "AI confidence changed",
  "AI data insufficient",
] as const;

export const WORKFLOW_EVENT_CATALOG = {
  Lead: LEAD_EVENTS,
  "Live transfer": LIVE_TRANSFER_EVENTS,
  Customer: CUSTOMER_EVENTS,
  Site: SITE_EVENTS,
  Quote: QUOTE_EVENTS,
  Contract: CONTRACT_EVENTS,
  Renewal: RENEWAL_EVENTS,
  Commission: COMMISSION_EVENTS,
  Supplier: SUPPLIER_EVENTS,
  Task: TASK_EVENTS,
  AI: AI_EVENTS,
} as const;

export type WorkflowEventInput = {
  eventType: string;
  businessArea: string;
  recordType: string;
  recordId: string;
  customerId?: string | null;
  siteId?: string | null;
  actor?: string;
  source?: string;
  timestamp?: string;
  previousState?: string;
  newState?: string;
  priority?: string;
  riskLevel?: string;
  confidenceLevel?: string;
  humanApprovalRequired?: boolean;
  metadata?: Record<string, string>;
  correlationId?: string;
  parentEventId?: string | null;
  status?: string;
  notes?: string;
};

let demoEventCounter = 0;

export function formatWorkflowUkDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(d);
}

/** Creates a labelled demonstration workflow event (no persistence). */
export function createDemoWorkflowEvent(input: WorkflowEventInput): import("./types").WorkflowEvent {
  demoEventCounter += 1;
  const timestamp = input.timestamp ?? "2026-07-28T14:30:00.000Z";
  return {
    eventId: `WF-EVT-DEMO-${String(demoEventCounter).padStart(5, "0")}`,
    eventType: input.eventType,
    businessArea: input.businessArea,
    recordType: input.recordType,
    recordId: input.recordId,
    customerId: input.customerId ?? null,
    siteId: input.siteId ?? null,
    actor: input.actor ?? "System (demo)",
    source: input.source ?? "Workflow intelligence (demo)",
    timestamp,
    timestampLabel: formatWorkflowUkDateTime(timestamp),
    previousState: input.previousState ?? "—",
    newState: input.newState ?? "—",
    priority: input.priority ?? "Medium",
    riskLevel: input.riskLevel ?? "Low",
    confidenceLevel: input.confidenceLevel ?? "Medium confidence",
    humanApprovalRequired: input.humanApprovalRequired ?? false,
    demonstration: true,
    metadata: input.metadata ?? {},
    correlationId: input.correlationId ?? "CORR-DEMO-0001",
    parentEventId: input.parentEventId ?? null,
    status: input.status ?? "Completed",
    notes: input.notes ?? "Demonstration event only",
  };
}

export function isTerminalEventStatus(status: string): boolean {
  return ["Completed", "Failed", "Cancelled", "Superseded"].includes(status);
}

export function eventStatusBadgeTone(status: string): "emerald" | "amber" | "rose" | "slate" {
  if (status === "Completed") return "emerald";
  if (status === "Waiting for approval" || status === "Processing") return "amber";
  if (status === "Failed") return "rose";
  return "slate";
}
