import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalPermission } from "@/lib/auth/enforceWrite";

import { LeadsPageClient, type CrmLeadRow } from "@/components/leads/LeadsPageClient";
import { loadLeadRevenueViews } from "@/lib/revenue-engine/loadLeadRevenueViews";
import { syncAllLeadQualifications } from "@/lib/revenue-engine/syncAllLeadQualifications";
import type { ActivityRecencyInput } from "@/lib/revenue-engine/activityRecency";
import type { CanonicalLead } from "@/lib/shared/domain";

const LEAD_COLUMNS =
  "id, created_at, company_name, contact_name, telephone, email, supplier, contract_end, status, notes, lead_source, source_detail, source_provenance, qualification_classification, qualification_score, qualification_computed_at";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .order("created_at", { ascending: false });

  const crmLeads: CrmLeadRow[] = data ?? [];
  const revenueViews = data
    ? await loadLeadRevenueViews(supabase, data as CanonicalLead[], new Date())
    : {};

  async function recomputeUnscoredLeadQualifications() {
    "use server";

    const user = await requireOperationalPermission("records:write");
    const supabase = await createClient();

    const { data: unscoredLeads } = await supabase
      .from("leads")
      .select(
        "id, created_at, company_name, contact_name, telephone, email, supplier, contract_end, status, notes, lead_source, source_detail, source_provenance, consent_given, qualification_classification, qualification_score",
      )
      .is("qualification_classification", null);

    const leads = (unscoredLeads ?? []) as CanonicalLead[];
    const leadIds = leads.map((lead) => lead.id);

    const { data: activityRows } =
      leadIds.length > 0
        ? await supabase.from("activities").select("lead_id, activity_date").in("lead_id", leadIds)
        : { data: [] as { lead_id: number; activity_date: string | null }[] };

    const activitiesByLead = new Map<number, ActivityRecencyInput[]>();
    for (const row of activityRows ?? []) {
      const existing = activitiesByLead.get(row.lead_id) ?? [];
      existing.push({ activity_date: row.activity_date });
      activitiesByLead.set(row.lead_id, existing);
    }

    await syncAllLeadQualifications(supabase, leads, activitiesByLead, { id: user.id, role: user.role }, new Date());

    revalidatePath("/leads");
    redirect("/leads");
  }

  return (
    <>
      <div className="mx-auto flex max-w-7xl justify-end px-6 pt-4">
        <Link href="/leads/generator" className="rounded-md border px-4 py-2 text-sm font-medium">
          Lead Intelligence Generator
        </Link>
      </div>
      <LeadsPageClient
        crmLeads={crmLeads}
        supabaseError={Boolean(error)}
        revenueViews={revenueViews}
        recomputeUnscoredLeadQualifications={recomputeUnscoredLeadQualifications}
      />
    </>
  );
}
