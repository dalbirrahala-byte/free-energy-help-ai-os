import type {
  ApprovalQueueRow,
  AutomationException,
  IntegrationCard,
  ScheduledAutomationRow,
  WorkflowRegisterRow,
  WorkflowRunRow,
} from "./types";

export function getDemoWorkflowRegister(): WorkflowRegisterRow[] {
  return [
    row("wf-ren-90", "90-day renewal task", "Renewals", "Contract expiring", "Active", "28 Jul 2026 08:12", "29 Jul 2026 08:00", "412", "2", "Yes", "Alex Morgan (demo)", "Demonstration"),
    row("wf-lead-qual", "New lead qualification", "Leads", "Record created", "Active", "28 Jul 2026 09:45", "Continuous", "890", "1", "No", "Jordan Lee (demo)", "Demonstration"),
    row("wf-lt-assign", "Agent assignment", "Live transfers", "Live transfer received", "Paused", "27 Jul 2026 16:20", "—", "156", "0", "No", "Jordan Lee (demo)", "Development"),
    row("wf-quote-exp", "Quote expiry warning", "Quotes", "Quote expiring", "Waiting for approval", "28 Jul 2026 07:00", "29 Jul 2026 07:00", "220", "4", "Yes", "Sam Patel (demo)", "Demonstration"),
    row("wf-co-overdue", "Commission overdue", "Commission", "Commission overdue", "Active", "28 Jul 2026 06:30", "Daily 06:30", "98", "3", "Yes", "Alex Morgan (demo)", "Development"),
    row("wf-cust-inact", "Customer inactivity alert", "Customers", "Time scheduled", "Ready", "—", "01 Aug 2026 09:00", "0", "0", "No", "Sam Patel (demo)", "Demonstration"),
    row("wf-ai-nba", "Next-best-action recommendation", "AI", "Manual trigger", "Disabled", "—", "—", "0", "0", "Yes", "Platform (demo)", "Demonstration"),
    row("wf-task-overdue", "Daily overdue task alert", "Tasks", "Time scheduled", "Active", "28 Jul 2026 07:15", "29 Jul 2026 07:15", "365", "0", "No", "Alex Morgan (demo)", "Demonstration"),
  ];
}

function row(
  id: string,
  name: string,
  businessArea: string,
  trigger: string,
  status: WorkflowRegisterRow["status"],
  lastRun: string,
  nextScheduled: string,
  ok: string,
  fail: string,
  approval: string,
  owner: string,
  environment: WorkflowRegisterRow["environment"],
): WorkflowRegisterRow {
  return {
    id,
    name,
    businessArea,
    trigger,
    status,
    lastRun: lastRun === "—" ? "Not run (demo)" : `${lastRun} (demo)`,
    nextScheduled: nextScheduled === "—" ? "— (demo)" : `${nextScheduled} (demo)`,
    successfulRuns: `${ok} (demo)`,
    failedRuns: `${fail} (demo)`,
    approvalRequired: approval,
    owner,
    environment,
  };
}

export function getDemoApprovalQueue(): ApprovalQueueRow[] {
  return [
    {
      id: "ap-1",
      workflow: "Quote expiry warning",
      record: "Derby Manufacturing — QTE-2026-0147",
      proposedAction: "Draft customer email (demo)",
      reason: "Quote expires in 48 hours",
      requestedAt: "28 Jul 2026 07:05 (demo)",
      riskLevel: "Medium",
      requestedBy: "Automation (demo)",
    },
    {
      id: "ap-2",
      workflow: "90-day renewal task",
      record: "Peak Logistics Group",
      proposedAction: "Notify customer — renewal pack (demo)",
      reason: "Approval required before communication",
      requestedAt: "28 Jul 2026 08:20 (demo)",
      riskLevel: "High",
      requestedBy: "Automation (demo)",
    },
  ];
}

export function getDemoRunHistory(): WorkflowRunRow[] {
  return [
    {
      id: "run-8842",
      workflow: "New lead qualification",
      started: "28 Jul 2026 09:45:01",
      completed: "28 Jul 2026 09:45:04",
      duration: "3s (demo)",
      triggerRecord: "Lead #1042",
      outcome: "Successful",
      errorMessage: "—",
      retryStatus: "N/A",
      environment: "Demonstration",
    },
    {
      id: "run-8841",
      workflow: "Commission overdue",
      started: "28 Jul 2026 06:30:00",
      completed: "28 Jul 2026 06:30:12",
      duration: "12s (demo)",
      triggerRecord: "Commission row #882",
      outcome: "Waiting for approval",
      errorMessage: "—",
      retryStatus: "N/A",
      environment: "Development",
    },
    {
      id: "run-8839",
      workflow: "Agent assignment",
      started: "27 Jul 2026 16:20:11",
      completed: "27 Jul 2026 16:20:45",
      duration: "34s (demo)",
      triggerRecord: "Transfer #771",
      outcome: "Failed",
      errorMessage: "Twilio — Not connected (demo)",
      retryStatus: "Queued (demo)",
      environment: "Development",
    },
  ];
}

export function getDemoExceptions(): AutomationException[] {
  return [
    { id: "ex-1", type: "Failed workflows", detail: "Agent assignment — 1 failure (demo)", recommendedAction: "Review Twilio integration — Not connected" },
    { id: "ex-2", type: "Missing data", detail: "2 customers missing contract end (demo)", recommendedAction: "Complete CRM site data" },
    { id: "ex-3", type: "Invalid email", detail: "1 lead email failed validation (demo)", recommendedAction: "Fix lead record manually" },
    { id: "ex-4", type: "No assigned account manager", detail: "3 records unassigned (demo)", recommendedAction: "Run lead assignment workflow" },
    { id: "ex-5", type: "External service unavailable", detail: "n8n — Not connected (demo)", recommendedAction: "Configure n8n in future phase" },
    { id: "ex-6", type: "Approval expired", detail: "1 quote email approval timed out (demo)", recommendedAction: "Re-queue or discard in demo UI" },
  ];
}

export function getDemoScheduled(): ScheduledAutomationRow[] {
  return [
    sched("sch-1", "Daily overdue task review", "Daily 07:15", "29 Jul 2026 07:15", "28 Jul 2026 07:15", "Europe/London", "Active (demo)", "Alex Morgan (demo)"),
    sched("sch-2", "Morning renewal digest", "Weekdays 08:00", "29 Jul 2026 08:00", "28 Jul 2026 08:00", "Europe/London", "Active (demo)", "Jordan Lee (demo)"),
    sched("sch-3", "Weekly commission reconciliation", "Mon 06:30", "04 Aug 2026 06:30", "28 Jul 2026 06:30", "Europe/London", "Active (demo)", "Alex Morgan (demo)"),
    sched("sch-4", "Monthly supplier review", "1st 09:00", "01 Aug 2026 09:00", "01 Jul 2026 09:00", "Europe/London", "Ready (demo)", "Sam Patel (demo)"),
    sched("sch-5", "Daily live-transfer summary", "Daily 18:00", "28 Jul 2026 18:00", "27 Jul 2026 18:00", "Europe/London", "Paused (demo)", "Jordan Lee (demo)"),
    sched("sch-6", "Weekly executive report", "Fri 07:00", "01 Aug 2026 07:00", "25 Jul 2026 07:00", "Europe/London", "Active (demo)", "Platform (demo)"),
    sched("sch-7", "Customer inactivity review", "Weekly Mon 10:00", "04 Aug 2026 10:00", "28 Jul 2026 10:00", "Europe/London", "Active (demo)", "Sam Patel (demo)"),
  ];
}

function sched(
  id: string,
  workflow: string,
  schedule: string,
  nextRun: string,
  lastRun: string,
  timeZone: string,
  status: string,
  owner: string,
): ScheduledAutomationRow {
  return { id, workflow, schedule, nextRun: `${nextRun} (demo)`, lastRun: `${lastRun} (demo)`, timeZone, status, owner };
}

export function getDemoIntegrations(): IntegrationCard[] {
  return [
    { id: "int-supabase", name: "Supabase", status: "Configuration required", detail: "CRM reads exist; automation writes not enabled." },
    { id: "int-n8n", name: "n8n", status: "Not connected", detail: "Orchestration planned — no live webhooks." },
    { id: "int-openai", name: "OpenAI", status: "Not connected", detail: "AI workflows UI-only." },
    { id: "int-gmail", name: "Gmail", status: "Not connected", detail: "Send email actions disabled." },
    { id: "int-outlook", name: "Microsoft Outlook", status: "Not connected", detail: "Planned for briefing digests." },
    { id: "int-m365", name: "Microsoft 365 Calendar", status: "Planned", detail: "Appointments module not configured." },
    { id: "int-twilio", name: "Twilio", status: "Not connected", detail: "Live transfers demo only." },
    { id: "int-wa", name: "WhatsApp", status: "Planned", detail: "Not in scope." },
    { id: "int-ch", name: "Companies House", status: "Planned", detail: "Lead enrichment future phase." },
    { id: "int-docusign", name: "DocuSign", status: "Not connected", detail: "Contract signing placeholder." },
    { id: "int-slack", name: "Slack", status: "Planned", detail: "Internal alerts future phase." },
    { id: "int-drive", name: "Google Drive", status: "Not connected", detail: "Document store not configured." },
  ];
}
