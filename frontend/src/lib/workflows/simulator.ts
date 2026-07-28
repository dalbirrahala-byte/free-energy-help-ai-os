import type { SimulationResult, SimulationScenarioId } from "./types";

const SCENARIOS: Record<SimulationScenarioId, SimulationResult> = {
  "lead-journey": {
    scenarioId: "lead-journey",
    title: "Example lead journey",
    inputEvent: "Lead created — LEAD-DEMO-8842 (demo)",
    rulesEvaluated: ["HIGH_VALUE_LEAD_GBP", "NO_CONTACT_CUSTOMER_DAYS"],
    conditionsPassed: ["Lead source valid (demo)", "Duplicate check clear (demo)"],
    actionsProposed: ["Assign account manager", "Create contact task", "Open quote opportunity"],
    approvalRequired: ["High-value assignment (demo)"],
    expectedResult: "Qualified lead with Customer 360 path (demo — no records changed)",
    timeline: [
      { label: "T+0s", detail: "Lead created event queued" },
      { label: "T+2s", detail: "Duplicate check completed (demo)" },
      { label: "T+5s", detail: "Qualification rules evaluated" },
      { label: "T+8s", detail: "Tasks proposed — awaiting approval placeholder" },
    ],
  },
  "live-transfer": {
    scenarioId: "live-transfer",
    title: "Example live transfer",
    inputEvent: "Transfer received — XFR-DEMO-2201 (demo)",
    rulesEvaluated: ["LIVE_TRANSFER_WAIT_SECONDS"],
    conditionsPassed: ["Agent pool available (demo)"],
    actionsProposed: ["Assign agent", "Start wait timer", "Create lead on connect"],
    approvalRequired: [],
    expectedResult: "Transfer outcome recorded with correlation ID (demo)",
    timeline: [
      { label: "T+0s", detail: "Transfer received" },
      { label: "T+72s", detail: "Wait threshold not breached (demo)" },
      { label: "T+90s", detail: "Transfer connected — lead creation proposed" },
    ],
  },
  "quote-acceptance": {
    scenarioId: "quote-acceptance",
    title: "Example quote acceptance",
    inputEvent: "Quote accepted — QTE-2026-0147 (demo)",
    rulesEvaluated: ["QUOTE_EXPIRY_WARNING_DAYS", "MISSING_DATA_FIELD_THRESHOLD"],
    conditionsPassed: ["Margin within band (demo)", "MPAN present (demo)"],
    actionsProposed: ["Create contract draft", "Paperwork check", "Customer onboarding prep"],
    approvalRequired: ["Internal margin sign-off (demo)"],
    expectedResult: "Contract onboarding workflow triggered (demo)",
    timeline: [
      { label: "T+0s", detail: "Quote accepted event" },
      { label: "T+3s", detail: "Data completeness 94% (demo)" },
      { label: "T+6s", detail: "Contract creation proposed" },
    ],
  },
  "contract-onboarding": {
    scenarioId: "contract-onboarding",
    title: "Example contract onboarding",
    inputEvent: "Contract accepted — CTR-DEMO-991 (demo)",
    rulesEvaluated: ["HIGH_CONSUMPTION_KWH", "RENEWAL_WINDOW_DAYS"],
    conditionsPassed: ["Sites validated (demo)"],
    actionsProposed: ["Meter validation", "Commission forecast", "Renewal date creation"],
    approvalRequired: ["Commission forecast publish (demo)"],
    expectedResult: "Live contract with renewal date (demo)",
    timeline: [
      { label: "T+0s", detail: "Contract accepted" },
      { label: "T+10s", detail: "Site and meter checks" },
      { label: "T+20s", detail: "Forecast and renewal milestones proposed" },
    ],
  },
  renewal: {
    scenarioId: "renewal",
    title: "Example renewal",
    inputEvent: "Renewal window opened — 30 day window (demo)",
    rulesEvaluated: ["RENEWAL_WINDOW_DAYS", "CUSTOMER_RISK_ESCALATION_SCORE"],
    conditionsPassed: ["Window 30d matched (demo)"],
    actionsProposed: ["Risk assessment", "Create renewal task", "Produce quote"],
    approvalRequired: ["Renewal pricing send (demo)"],
    expectedResult: "Renewal quote path active (demo)",
    timeline: [
      { label: "T+0s", detail: "Renewal window event" },
      { label: "T+4s", detail: "Risk score updated (demo)" },
      { label: "T+12s", detail: "Contact task proposed" },
    ],
  },
  "commission-dispute": {
    scenarioId: "commission-dispute",
    title: "Example commission dispute",
    inputEvent: "Commission underpaid — COM-DEMO-772 (demo)",
    rulesEvaluated: ["COMMISSION_OVERDUE_DAYS", "SUPPLIER_PAYMENT_DETERIORATION_DAYS"],
    conditionsPassed: ["Payment variance > demo threshold"],
    actionsProposed: ["Raise dispute", "Notify finance", "Update reporting"],
    approvalRequired: ["Financial action (demo)"],
    expectedResult: "Dispute workflow queued (demo)",
    timeline: [
      { label: "T+0s", detail: "Underpayment detected" },
      { label: "T+5s", detail: "Reconciliation failed (demo)" },
      { label: "T+9s", detail: "Dispute case proposed" },
    ],
  },
  "customer-risk": {
    scenarioId: "customer-risk",
    title: "Example customer-risk escalation",
    inputEvent: "Customer at risk — no contact 31 days (demo)",
    rulesEvaluated: ["NO_CONTACT_CUSTOMER_DAYS", "CUSTOMER_RISK_ESCALATION_SCORE"],
    conditionsPassed: ["Risk score 78 (demo)"],
    actionsProposed: ["AI recommendation", "Notify AM", "Management escalation timer"],
    approvalRequired: ["AI recommendation", "Customer communication (demo)"],
    expectedResult: "Intervention plan with escalation path (demo)",
    timeline: [
      { label: "T+0s", detail: "Risk event raised" },
      { label: "T+2s", detail: "AI draft proposed — not connected" },
      { label: "T+7s", detail: "Escalation scheduled if unresolved (demo)" },
    ],
  },
};

export function listSimulationScenarios(): { id: SimulationScenarioId; label: string }[] {
  return (Object.keys(SCENARIOS) as SimulationScenarioId[]).map((id) => ({
    id,
    label: SCENARIOS[id].title,
  }));
}

/** UI-only simulation — does not mutate any records. */
export function runWorkflowSimulation(scenarioId: SimulationScenarioId): SimulationResult {
  return SCENARIOS[scenarioId];
}

export function evaluateNextBestActionDemo(workflowId: string, eventType: string): string {
  return `Demo NBA for ${workflowId} after "${eventType}" — not connected`;
}

export function evaluateExceptionDetectionDemo(missingCount: number): boolean {
  return missingCount >= 2;
}
