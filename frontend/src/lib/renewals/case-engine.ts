import { formatDisplayDate } from "./demo-data";
import type {
  CasePriority,
  RenewalCase,
  RenewalCaseChecklist,
  RenewalCaseNote,
  RenewalCaseStatus,
  RenewalCaseTimelineEntry,
  RenewalChecklistItem,
} from "./case-types";
import { RENEWAL_CHECKLIST_ITEMS } from "./case-types";
import type { DemoRenewalRecord } from "./types";

const CASE_ID_YEAR = 2026;

export function formatRenewalCaseId(sequence: number): string {
  return `RN-${CASE_ID_YEAR}-${String(sequence).padStart(4, "0")}`;
}

export function casePriorityFromDays(daysRemaining: number): CasePriority {
  if (daysRemaining <= 30) {
    return "Critical";
  }

  if (daysRemaining <= 60) {
    return "High";
  }

  if (daysRemaining <= 90) {
    return "Medium";
  }

  return "Planned";
}

function emptyChecklist(): RenewalCaseChecklist {
  return RENEWAL_CHECKLIST_ITEMS.reduce(
    (acc, item) => {
      acc[item] = false;
      return acc;
    },
    {} as RenewalCaseChecklist,
  );
}

function formatTimelineLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function timelineEntry(
  kind: RenewalCaseTimelineEntry["kind"],
  summary: string,
): RenewalCaseTimelineEntry {
  const occurredAt = new Date().toISOString();

  return {
    id: `tl-${kind}-${occurredAt}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    occurredAt,
    occurredLabel: formatTimelineLabel(occurredAt),
    summary,
  };
}

export function buildRenewalCase(
  record: DemoRenewalRecord,
  sequence: number,
): RenewalCase {
  const dateCreated = new Date().toISOString();
  const caseId = formatRenewalCaseId(sequence);

  const renewalCase: RenewalCase = {
    caseId,
    registerRecordId: record.id,
    customerName: record.customerName,
    siteName: record.siteName,
    currentSupplier: record.supplier,
    contractEndDate: record.contractEnd,
    estimatedAnnualConsumptionKwh: record.estimatedAnnualConsumptionKwh,
    estimatedAnnualContractValueGbp: record.estimatedAnnualContractValueGbp,
    estimatedCommissionGbp: record.estimatedBrokerCommissionGbp,
    accountManager: record.accountManager,
    priority: casePriorityFromDays(record.daysUntilEnd),
    status: "Qualification",
    daysRemaining: record.daysUntilEnd,
    lastContactDate: record.lastContact,
    dateCreated,
    dateCreatedLabel: formatDisplayDate(dateCreated.slice(0, 10)),
    checklist: emptyChecklist(),
    timeline: [
      timelineEntry("case_created", `Renewal case ${caseId} created from intelligence register.`),
    ],
    notes: [],
    customerId: record.customerId,
    aiRecommendationDemo: record.aiRecommendation,
  };

  return renewalCase;
}

export function deriveNextRecommendedAction(
  renewalCase: RenewalCase,
): { title: string; detail: string } {
  const days = renewalCase.daysRemaining;
  const checklist = renewalCase.checklist;
  const firstIncomplete = RENEWAL_CHECKLIST_ITEMS.find((item) => !checklist[item]);

  const lastContact = new Date(`${renewalCase.lastContactDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceContact = Math.floor(
    (today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (renewalCase.status === "Lost" || renewalCase.status === "On Hold") {
    return {
      title: `Case is ${renewalCase.status}`,
      detail: "Review case status before taking further renewal actions.",
    };
  }

  if (days <= 30 && !checklist["Customer contacted"]) {
    return {
      title: "Urgent: contact customer",
      detail: `Contract ends in ${days} days — priority is Critical. Complete “Customer contacted”.`,
    };
  }

  if (daysSinceContact > 21 && !checklist["Renewal meeting booked"]) {
    return {
      title: "Re-engage after gap in contact",
      detail: `Last contact was ${daysSinceContact} days ago. Book a renewal meeting or log outreach.`,
    };
  }

  if (firstIncomplete) {
    return {
      title: `Complete: ${firstIncomplete}`,
      detail: `Next checklist step in the renewal progress path (${renewalCase.priority} priority, ${days} days remaining).`,
    };
  }

  if (renewalCase.status !== "Contract Signed") {
    return {
      title: "Advance case status",
      detail: "All checklist items are complete — update status toward contract signed and commission expected.",
    };
  }

  return {
    title: "Monitor commission",
    detail: "Renewal checklist complete — confirm commission expected and close out the case.",
  };
}

export function toggleChecklistItem(
  renewalCase: RenewalCase,
  item: RenewalChecklistItem,
): RenewalCase {
  const wasComplete = renewalCase.checklist[item];
  const checklist = { ...renewalCase.checklist, [item]: !wasComplete };
  const timeline = [...renewalCase.timeline];

  timeline.unshift(
    timelineEntry(
      wasComplete ? "checklist_reopened" : "checklist_completed",
      wasComplete
        ? `Checklist item marked outstanding: ${item}.`
        : `Checklist item completed: ${item}.`,
    ),
  );

  return { ...renewalCase, checklist, timeline };
}

export function updateCaseStatus(
  renewalCase: RenewalCase,
  status: RenewalCaseStatus,
): RenewalCase {
  if (status === renewalCase.status) {
    return renewalCase;
  }

  const previous = renewalCase.status;
  const timeline = [
    timelineEntry("status_changed", `Status changed from ${previous} to ${status}.`),
    ...renewalCase.timeline,
  ];

  return { ...renewalCase, status, timeline };
}

export function addCaseNote(renewalCase: RenewalCase, body: string): RenewalCase | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const note: RenewalCaseNote = {
    id: `note-${createdAt}`,
    body: trimmed,
    createdAt,
    createdLabel: formatTimelineLabel(createdAt),
  };

  const timeline = [
    timelineEntry("note_added", `Note added: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""}`),
    ...renewalCase.timeline,
  ];

  return {
    ...renewalCase,
    notes: [note, ...renewalCase.notes],
    timeline,
  };
}

export function casePriorityTone(priority: CasePriority): string {
  switch (priority) {
    case "Critical":
      return "bg-red-100 text-red-900 border-red-200";
    case "High":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-900 border-yellow-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
