export type RevenueLeadInput = {
  id: number;
  companyName: string;
  status: string | null;
  createdAt: string | null;
  leadSource: string | null;
  sourceDetail: string | null;
  campaign: string | null;
  contractEnd: string | null;
  supplier: string | null;
  leadOwner: string | null;
  nextAction: string | null;
  followUpRequired: boolean | null;
  followUpDate: string | null;
  lastActivityDate: string | null;
};

export type RevenueAction = {
  leadId: number;
  companyName: string;
  status: string;
  owner: string;
  nextAction: string;
  dueLabel: string;
  sourceLabel: string;
  renewalLabel: string | null;
  href: string;
  priority: "critical" | "today" | "attention" | "new";
};

const CLOSED_STATUSES = new Set(["Won", "Lost"]);

function sourceLabel(lead: RevenueLeadInput): string {
  const channel = lead.leadSource?.trim() || "Source not recorded";
  const detail = lead.campaign?.trim() || lead.sourceDetail?.trim();
  return detail ? `${channel} · ${detail}` : channel;
}

function renewalLabel(lead: RevenueLeadInput): string | null {
  if (!lead.contractEnd && !lead.supplier) return null;
  if (lead.contractEnd && lead.supplier) return `${lead.supplier} · contract ends ${lead.contractEnd}`;
  if (lead.contractEnd) return `Contract ends ${lead.contractEnd}`;
  return `${lead.supplier} · contract end not recorded`;
}

export function buildRevenueActions(
  leads: RevenueLeadInput[],
  todayKey: string,
  staleSinceKey: string,
  limit = 12,
): RevenueAction[] {
  const ranked: Array<RevenueAction & { rank: number; tie: string }> = [];

  for (const lead of leads) {
    const status = lead.status || "New";
    if (CLOSED_STATUSES.has(status)) continue;

    const isOverdue = Boolean(lead.followUpDate && lead.followUpDate < todayKey);
    const isToday = lead.followUpDate === todayKey;
    const isExplicit = lead.followUpRequired === true;
    const isStale = !lead.lastActivityDate || lead.lastActivityDate < staleSinceKey;
    const isNew = status === "New";

    if (!isOverdue && !isToday && !isExplicit && !isStale && !isNew) continue;

    let priority: RevenueAction["priority"];
    let rank: number;
    let dueLabel: string;

    if (isOverdue) {
      priority = "critical";
      rank = 0;
      dueLabel = `Overdue · ${lead.followUpDate}`;
    } else if (isToday) {
      priority = "today";
      rank = 1;
      dueLabel = "Due today";
    } else if (isExplicit || isStale) {
      priority = "attention";
      rank = 2;
      dueLabel = lead.followUpDate ? `Due ${lead.followUpDate}` : isStale ? "Follow-up needed" : "Follow-up required";
    } else {
      priority = "new";
      rank = 3;
      dueLabel = "New enquiry";
    }

    ranked.push({
      leadId: lead.id,
      companyName: lead.companyName,
      status,
      owner: lead.leadOwner?.trim() || "Unassigned",
      nextAction: lead.nextAction?.trim() || (isNew ? "Review enquiry and assign follow-up" : "Review lead and set next action"),
      dueLabel,
      sourceLabel: sourceLabel(lead),
      renewalLabel: renewalLabel(lead),
      href: `/leads/${lead.id}`,
      priority,
      rank,
      tie: lead.followUpDate || lead.createdAt || "9999-12-31",
    });
  }

  return ranked
    .sort((a, b) => a.rank - b.rank || a.tie.localeCompare(b.tie) || a.leadId - b.leadId)
    .slice(0, limit)
    .map(({ rank: _rank, tie: _tie, ...action }) => action);
}
