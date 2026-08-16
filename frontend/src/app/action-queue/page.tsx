import { createClient } from "@/lib/supabase/server";
import { loadLeadRevenueViews } from "@/lib/revenue-engine/loadLeadRevenueViews";
import { buildActionQueue, summarizeTasksByLead, type ActionQueueLeadInput, type ActionQueueTaskRow } from "@/lib/revenue-engine/actionQueue";
import { ActionQueueClient } from "@/components/action-queue/ActionQueueClient";
import type { CanonicalLead } from "@/lib/shared/domain";

// Factory 030: Controlled Action Queue. Read-only — the only writes reachable
// from this page are via the existing, unmodified /tasks/new form (Factory
// 029's pre-fill bridge). No lead is ever contacted, called, or messaged by
// anything on this page.

const LEAD_COLUMNS =
  "id, created_at, company_name, contact_name, telephone, email, supplier, contract_end, status, notes, lead_source, source_detail, source_provenance, qualification_classification, qualification_score, qualification_reasons";

export default async function ActionQueuePage() {
  const supabase = await createClient();

  const { data: leadRows, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .order("created_at", { ascending: false });

  const leads = (leadRows ?? []) as (CanonicalLead & { qualification_reasons: unknown })[];
  const leadIds = leads.map((lead) => lead.id);

  const [revenueViews, { data: taskRows }] = await Promise.all([
    leads.length > 0 ? loadLeadRevenueViews(supabase, leads, new Date()) : Promise.resolve({}),
    leadIds.length > 0
      ? supabase.from("tasks").select("lead_id, status, due_date").in("lead_id", leadIds)
      : Promise.resolve({ data: [] as ActionQueueTaskRow[] }),
  ]);

  const tasksByLead = summarizeTasksByLead((taskRows ?? []) as ActionQueueTaskRow[]);

  const queueInputs: ActionQueueLeadInput[] = leads.map((lead) => ({
    id: lead.id,
    company_name: lead.company_name,
    contact_name: lead.contact_name,
    status: lead.status,
    qualification_classification: (lead.qualification_classification ?? null) as ActionQueueLeadInput["qualification_classification"],
    qualification_score: lead.qualification_score ?? null,
    qualification_reasons: lead.qualification_reasons,
  }));

  const queue = buildActionQueue(queueInputs, revenueViews, tasksByLead);

  return <ActionQueueClient queue={queue} supabaseError={Boolean(error)} />;
}
