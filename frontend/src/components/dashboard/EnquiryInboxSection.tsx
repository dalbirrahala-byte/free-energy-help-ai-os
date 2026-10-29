import Link from "next/link";

import { SectionCard } from "./SectionCard";
import type { EnquiryAttentionReason, EnquiryInboxItem } from "@/lib/dashboard/enquiryInbox";

const REASON_LABELS: Record<EnquiryAttentionReason, string> = {
  overdue_follow_up: "Follow-up overdue",
  follow_up_due_today: "Follow-up due today",
  unassigned_owner: "Owner not assigned",
  missing_follow_up_date: "Callback date missing",
  new_enquiry: "New enquiry",
  missing_next_action: "Next action missing",
};

export function EnquiryInboxSection({
  items,
  total,
  available,
}: {
  items: readonly EnquiryInboxItem[];
  total: number;
  available: boolean;
}) {
  return (
    <div id="enquiry-inbox" className="scroll-mt-6">
      <SectionCard
        title={`Enquiries requiring review${available ? ` (${total})` : ""}`}
        description="Read-only CRM attention list: missing owners, callback dates and overdue follow-ups. No messages are sent automatically."
        action={{ label: "Open leads", href: "/leads" }}
      >
        {!available ? (
          <p className="text-sm text-amber-700" role="status">
            Enquiry inbox unavailable — verify CRM data access. No zero count assumed.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No lead records currently need this type of review.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Showing {items.length} of {total} records. Review each lead before contacting anyone.
            </p>
            <ul className="space-y-2">
              {items.map((lead) => (
                <li key={lead.id} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-emerald-700 hover:underline">
                        {lead.companyName}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        Source: {lead.sourceLabel} · Owner: {lead.ownerLabel}
                        {lead.followUpDate ? ` · Follow-up: ${lead.followUpDate}` : ""}
                      </p>
                    </div>
                    <div className="flex max-w-full flex-wrap gap-1.5">
                      {lead.reasons.slice(0, 3).map((reason) => (
                        <span key={reason} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                          {REASON_LABELS[reason]}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
