/**
 * FEH Mission Control: read-only attention signals from existing CRM lead rows.
 * No contact permission, task creation, owner assignment or provider calls.
 * Unknown dates and absent fields are surfaced for review, never guessed.
 */
export type EnquiryInboxInput = Readonly<{
  id: number;
  company_name: string | null;
  status: string | null;
  lead_source: string | null;
  lead_owner: string | null;
  next_action: string | null;
  follow_up_required: boolean | null;
  follow_up_date: string | null;
  created_at: string | null;
}>;

export type EnquiryAttentionReason =
  | "overdue_follow_up"
  | "follow_up_due_today"
  | "unassigned_owner"
  | "missing_follow_up_date"
  | "new_enquiry"
  | "missing_next_action";

export type EnquiryInboxItem = Readonly<{
  id: number;
  companyName: string;
  sourceLabel: string;
  ownerLabel: string;
  followUpDate: string | null;
  reasons: readonly EnquiryAttentionReason[];
  priority: number;
}>;

export type EnquiryInboxResult = Readonly<{
  count: number;
  items: readonly EnquiryInboxItem[];
}>;

const MAX_ITEMS = 8;
const CLOSED_STATUSES = new Set(["won", "lost"]);
const REASONS: readonly EnquiryAttentionReason[] = [
  "overdue_follow_up",
  "follow_up_due_today",
  "unassigned_owner",
  "missing_follow_up_date",
  "new_enquiry",
  "missing_next_action",
];

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function dateKey(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return value;
}

/** Deterministic; caller passes the CRM-local YYYY-MM-DD date. */
export function buildEnquiryInbox(
  leads: readonly EnquiryInboxInput[],
  today: string,
  limit = MAX_ITEMS,
): EnquiryInboxResult {
  if (!dateKey(today)) throw new Error("invalid_today_key");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("invalid_inbox_limit");
  const rows: EnquiryInboxItem[] = [];
  const seenIds = new Set<number>();

  for (const lead of leads) {
    if (!Number.isSafeInteger(lead.id) || lead.id <= 0 || seenIds.has(lead.id)) continue;
    seenIds.add(lead.id);
    const status = clean(lead.status).toLowerCase();
    if (CLOSED_STATUSES.has(status)) continue;

    const reasons: EnquiryAttentionReason[] = [];
    const rawOwner = clean(lead.lead_owner);
    const owner = /^(?:unassigned|not assigned)$/i.test(rawOwner) ? "" : rawOwner;
    const nextAction = clean(lead.next_action);
    const followUp = dateKey(lead.follow_up_date);

    if (lead.follow_up_required === true && followUp && followUp < today) reasons.push("overdue_follow_up");
    if (lead.follow_up_required === true && followUp === today) reasons.push("follow_up_due_today");
    if (!owner) reasons.push("unassigned_owner");
    if (lead.follow_up_required === true && !followUp) reasons.push("missing_follow_up_date");
    if (!status || status === "new") reasons.push("new_enquiry");
    if (!nextAction) reasons.push("missing_next_action");

    if (!reasons.length) continue;
    reasons.sort((a, b) => REASONS.indexOf(a) - REASONS.indexOf(b));
    rows.push({
      id: lead.id,
      companyName: clean(lead.company_name) || "Company not recorded",
      sourceLabel: clean(lead.lead_source) || "Source not recorded",
      ownerLabel: owner || "Unassigned",
      followUpDate: followUp,
      reasons,
      priority: REASONS.indexOf(reasons[0]),
    });
  }

  rows.sort((a, b) => a.priority - b.priority || a.id - b.id);
  return { count: rows.length, items: rows.slice(0, limit) };
}
