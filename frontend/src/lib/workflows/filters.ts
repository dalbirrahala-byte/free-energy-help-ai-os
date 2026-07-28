import type { EventStreamFilters, WorkflowEvent } from "./types";

export function filterEventStream(events: WorkflowEvent[], filters: EventStreamFilters): WorkflowEvent[] {
  const q = filters.query.toLowerCase();
  return events.filter((e) => {
    if (filters.businessArea !== "all" && e.businessArea !== filters.businessArea) return false;
    if (filters.eventType !== "all" && e.eventType !== filters.eventType) return false;
    if (filters.status !== "all" && e.status !== filters.status) return false;
    if (filters.priority !== "all" && e.priority !== filters.priority) return false;
    if (filters.risk !== "all" && e.riskLevel !== filters.risk) return false;
    if (filters.owner !== "all" && e.actor !== filters.owner) return false;
    if (filters.customer !== "all" && (e.customerId ?? "") !== filters.customer && !e.metadata.customerName?.includes(filters.customer)) {
      return false;
    }
    if (filters.source !== "all" && e.source !== filters.source) return false;
    if (filters.approvalRequired === "yes" && !e.humanApprovalRequired) return false;
    if (filters.approvalRequired === "no" && e.humanApprovalRequired) return false;
    if (!q) return true;
    const hay = `${e.eventType} ${e.recordId} ${e.correlationId} ${e.notes} ${e.metadata.customerName ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export function uniqueEventTypes(events: WorkflowEvent[]): string[] {
  return [...new Set(events.map((e) => e.eventType))].sort();
}

export function uniqueEventOwners(events: WorkflowEvent[]): string[] {
  return [...new Set(events.map((e) => e.actor))].sort();
}

export function uniqueEventSources(events: WorkflowEvent[]): string[] {
  return [...new Set(events.map((e) => e.source))].sort();
}

export function orderEventsByTimeline(events: WorkflowEvent[]): WorkflowEvent[] {
  return [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function detectMissingDataExceptionsDemo(fields: { label: string; present: boolean }[]): string[] {
  return fields.filter((f) => !f.present).map((f) => f.label);
}
