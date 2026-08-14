import { createClient } from "@/lib/supabase/server";

import { LeadsPageClient, type CrmLeadRow } from "@/components/leads/LeadsPageClient";
import { loadLeadRevenueViews } from "@/lib/revenue-engine/loadLeadRevenueViews";
import type { CanonicalLead } from "@/lib/shared/domain";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, company_name, contact_name, telephone, email, supplier, contract_end, status, notes, lead_source, source_detail, source_provenance",
    )
    .order("created_at", { ascending: false });

  const crmLeads: CrmLeadRow[] = data ?? [];
  const revenueViews = data
    ? await loadLeadRevenueViews(supabase, data as CanonicalLead[], new Date())
    : {};

  return <LeadsPageClient crmLeads={crmLeads} supabaseError={Boolean(error)} revenueViews={revenueViews} />;
}
