import type { WorkflowEvent } from "./types";

const CORRELATION_PREFIX = "CORR-DEMO";

/** Generates a demonstration correlation ID for journey tracing. */
export function createCorrelationId(seed?: string): string {
  const suffix = seed ?? Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${CORRELATION_PREFIX}-${suffix}`;
}

export function linkEventsByCorrelation(events: WorkflowEvent[], correlationId: string): WorkflowEvent[] {
  return events
    .filter((e) => e.correlationId === correlationId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function traceCustomerJourneyEvents(events: WorkflowEvent[], correlationId: string): WorkflowEvent[] {
  return linkEventsByCorrelation(events, correlationId);
}

export function parentChildChain(events: WorkflowEvent[], rootEventId: string): WorkflowEvent[] {
  const byId = new Map(events.map((e) => [e.eventId, e]));
  const chain: WorkflowEvent[] = [];
  let current = byId.get(rootEventId);
  while (current) {
    chain.push(current);
    current = current.parentEventId ? byId.get(current.parentEventId) : undefined;
  }
  return chain.reverse();
}

export function mergeCorrelationIds(...ids: string[]): string {
  return ids.filter(Boolean).join(" / ") || createCorrelationId();
}
