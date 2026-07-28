export type WorkflowTemplateGroup = {
  area: string;
  workflows: { id: string; name: string }[];
};

export const WORKFLOW_CATALOGUE: WorkflowTemplateGroup[] = [
  {
    area: "Leads",
    workflows: [
      { id: "lead-1", name: "New lead qualification" },
      { id: "lead-2", name: "Duplicate lead check" },
      { id: "lead-3", name: "High-value lead alert" },
      { id: "lead-4", name: "Lead assignment" },
      { id: "lead-5", name: "No-contact follow-up" },
      { id: "lead-6", name: "Lead status escalation" },
    ],
  },
  {
    area: "Live transfers",
    workflows: [
      { id: "lt-1", name: "New live transfer received" },
      { id: "lt-2", name: "Agent assignment" },
      { id: "lt-3", name: "Wait-time escalation" },
      { id: "lt-4", name: "Missed transfer follow-up" },
      { id: "lt-5", name: "Transfer outcome logging" },
    ],
  },
  {
    area: "Customers",
    workflows: [
      { id: "cust-1", name: "New customer onboarding" },
      { id: "cust-2", name: "Missing customer information alert" },
      { id: "cust-3", name: "Customer inactivity alert" },
      { id: "cust-4", name: "Multi-site review" },
      { id: "cust-5", name: "Customer risk escalation" },
    ],
  },
  {
    area: "Quotes",
    workflows: [
      { id: "q-1", name: "Quote created" },
      { id: "q-2", name: "Quote ready for review" },
      { id: "q-3", name: "Quote sent follow-up" },
      { id: "q-4", name: "Quote viewed alert" },
      { id: "q-5", name: "Quote expiry warning" },
      { id: "q-6", name: "Quote accepted handover" },
      { id: "q-7", name: "Lost quote analysis" },
    ],
  },
  {
    area: "Contracts",
    workflows: [
      { id: "con-1", name: "Contract submitted" },
      { id: "con-2", name: "Missing paperwork check" },
      { id: "con-3", name: "Contract accepted" },
      { id: "con-4", name: "Contract live" },
      { id: "con-5", name: "Contract rejection alert" },
      { id: "con-6", name: "Contract anniversary review" },
    ],
  },
  {
    area: "Renewals",
    workflows: [
      { id: "ren-180", name: "180-day renewal preparation" },
      { id: "ren-120", name: "120-day renewal alert" },
      { id: "ren-90", name: "90-day renewal task" },
      { id: "ren-60", name: "60-day escalation" },
      { id: "ren-30", name: "30-day urgent action" },
      { id: "ren-exp", name: "Contract expired alert" },
      { id: "ren-won", name: "Renewal won" },
      { id: "ren-lost", name: "Renewal lost" },
    ],
  },
  {
    area: "Commission",
    workflows: [
      { id: "co-1", name: "Expected commission created" },
      { id: "co-2", name: "Supplier payment due" },
      { id: "co-3", name: "Commission overdue" },
      { id: "co-4", name: "Underpayment detected" },
      { id: "co-5", name: "Commission dispute created" },
      { id: "co-6", name: "Commission reconciliation required" },
      { id: "co-7", name: "Payment received" },
    ],
  },
  {
    area: "Tasks",
    workflows: [
      { id: "task-1", name: "Daily overdue task alert" },
      { id: "task-2", name: "Task assignment" },
      { id: "task-3", name: "Task escalation" },
      { id: "task-4", name: "Task completion follow-up" },
    ],
  },
  {
    area: "AI",
    workflows: [
      { id: "ai-1", name: "Customer summary request" },
      { id: "ai-2", name: "Renewal recommendation" },
      { id: "ai-3", name: "Lead score calculation" },
      { id: "ai-4", name: "Call preparation notes" },
      { id: "ai-5", name: "Draft follow-up email" },
      { id: "ai-6", name: "Next-best-action recommendation" },
    ],
  },
];

export const AUTOMATION_TEMPLATE_CARDS = [
  {
    id: "tpl-renewal",
    title: "Renewal campaign",
    description: "90/60/30-day renewal tasks and manager alerts (demo).",
    trigger: "Contract expiring",
    actions: "Create task, Notify account manager",
    approval: "Customer email requires approval",
    integrations: "n8n — Not connected; Email — Not connected",
    status: "Demonstration",
  },
  {
    id: "tpl-quote",
    title: "Quote follow-up",
    description: "Sent quote chase and expiry warnings (demo).",
    trigger: "Quote expiring",
    actions: "Draft email, Create task",
    approval: "Send email — approval required",
    integrations: "Gmail — Not connected",
    status: "Demonstration",
  },
  {
    id: "tpl-commission",
    title: "Commission chase",
    description: "Overdue and dispute escalation (demo).",
    trigger: "Commission overdue",
    actions: "Generate alert, Add to approval queue",
    approval: "Financial actions require approval",
    integrations: "Supabase — Configuration required",
    status: "Development",
  },
  {
    id: "tpl-onboard",
    title: "New customer onboarding",
    description: "Onboarding checklist and missing data checks (demo).",
    trigger: "Record created",
    actions: "Create task, Add internal note",
    approval: "None for internal tasks",
    integrations: "Supabase — Configuration required",
    status: "Demonstration",
  },
  {
    id: "tpl-lt",
    title: "Live-transfer response",
    description: "Agent assignment and wait-time escalation (demo).",
    trigger: "Live transfer received",
    actions: "Assign user, Generate alert",
    approval: "Not required",
    integrations: "Twilio — Not connected",
    status: "Demonstration",
  },
  {
    id: "tpl-lost",
    title: "Lost-customer recovery",
    description: "Lost renewal analysis task (demo).",
    trigger: "Status changed",
    actions: "Create task, Notify director",
    approval: "Director notify — demo only",
    integrations: "AI — Not connected",
    status: "Draft",
  },
  {
    id: "tpl-supplier",
    title: "Supplier review",
    description: "Monthly supplier scorecard reminder (demo).",
    trigger: "Time scheduled",
    actions: "Create task",
    approval: "Not required",
    integrations: "Slack — Planned",
    status: "Demonstration",
  },
  {
    id: "tpl-am",
    title: "Daily account-manager briefing",
    description: "Morning digest of tasks and renewals (demo).",
    trigger: "Time scheduled",
    actions: "Generate alert",
    approval: "Not required",
    integrations: "Outlook — Not connected",
    status: "Development",
  },
  {
    id: "tpl-exec",
    title: "Executive daily briefing",
    description: "KPI snapshot to leadership queue (demo).",
    trigger: "Time scheduled",
    actions: "Add to approval queue",
    approval: "Required before send",
    integrations: "Reports module — Demo data only",
    status: "Demonstration",
  },
];

export type CatalogueEntry = { id: string; name: string; area: string };

export function getCatalogueFlat(): CatalogueEntry[] {
  return WORKFLOW_CATALOGUE.flatMap((group) =>
    group.workflows.map((w) => ({ id: w.id, name: w.name, area: group.area })),
  );
}

export const TRIGGER_CATALOGUE = [
  "Record created",
  "Record updated",
  "Status changed",
  "Date reached",
  "Time scheduled",
  "Task overdue",
  "Contract expiring",
  "Quote expiring",
  "Commission overdue",
  "Live transfer received",
  "Manual trigger",
  "External webhook — Not connected",
];

export const CONDITION_CATALOGUE = [
  "Customer status",
  "Lead status",
  "Contract status",
  "Supplier",
  "Fuel type",
  "Consumption threshold",
  "Contract value",
  "Commission value",
  "Renewal days remaining",
  "Account manager",
  "Risk level",
  "Task priority",
  "Quote status",
  "Live transfer wait time",
];

export const ACTION_CATALOGUE = [
  "Create task",
  "Assign user",
  "Update status",
  "Add activity",
  "Add internal note",
  "Generate alert",
  "Add to approval queue",
  "Draft email",
  "Send email — Not connected",
  "Create quote placeholder",
  "Create renewal record placeholder",
  "Notify account manager",
  "Notify director",
  "Start n8n workflow — Not connected",
  "Call AI assistant — Not connected",
  "Trigger webhook — Not connected",
];

export const BUILDER_EXAMPLE = {
  trigger: "Contract reaches 90 days before end date",
  condition: "Customer is active and no renewal quote exists",
  action: "Create renewal task and notify account manager",
  approval: "Required before customer communication",
  result: "Renewal opportunity added to dashboard",
};

export const GOVERNANCE_ITEMS = [
  "Human approval enabled",
  "Production deployment locked",
  "Database migrations require approval",
  "Customer communications require approval",
  "Financial actions require approval",
  "Destructive actions blocked",
  "Audit logging planned",
  "Secrets not displayed",
  "Demo mode enabled",
];
