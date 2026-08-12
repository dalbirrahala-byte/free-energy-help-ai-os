import { createClient } from "@/lib/supabase/server";

import { LeadsPageClient, type CrmLeadRow } from "@/components/leads/LeadsPageClient";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, contact_name, telephone, email, supplier, contract_end, status, notes, lead_source",
    )
    .order("created_at", { ascending: false });

  const crmLeads: CrmLeadRow[] = data ?? [];

  return <LeadsPageClient crmLeads={crmLeads} supabaseError={Boolean(error)} />;
}
