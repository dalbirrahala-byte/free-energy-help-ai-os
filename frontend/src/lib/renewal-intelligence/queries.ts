import { createClient } from "@/lib/supabase/server";
import { addDaysLocal, formatDisplayDate, startOfTodayLocal, toDateKey } from "@/lib/dashboard/dates";
import { daysUntilContractEnd, urgencyBandForDays } from "@/lib/renewals/urgency";

import type { RenewalIntelligenceData, RenewalIntelligenceRow, RenewalIntelligenceSummary } from "./types";

const RENEWAL_HORIZON_DAYS = 180;

const EMPTY_SUMMARY: RenewalIntelligenceSummary = {
  overdueCount: 0,
  within30Count: 0,
  within60Count: 0,
  within90Count: 0,
  within180Count: 0,
};

type CustomerJoin = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
};

export async function loadRenewalIntelligenceData(): Promise<RenewalIntelligenceData> {
  const supabase = await createClient();
  const todayKey = toDateKey(startOfTodayLocal());
  const horizonKey = toDateKey(addDaysLocal(startOfTodayLocal(), RENEWAL_HORIZON_DAYS));

  const { data, error } = await supabase
    .from("customer_sites")
    .select(
      "id, name, contract_end, current_supplier, customer_id, customers ( id, company_name, contact_name, telephone, email )",
    )
    .not("contract_end", "is", null)
    .lte("contract_end", horizonKey)
    .order("contract_end", { ascending: true });

  if (error) {
    return { configured: false, summary: EMPTY_SUMMARY, rows: [] };
  }

  const rows: RenewalIntelligenceRow[] = [];

  for (const site of data ?? []) {
    if (!site.contract_end) {
      continue;
    }

    const customerJoin = site.customers as CustomerJoin | CustomerJoin[] | null;
    const customer = Array.isArray(customerJoin) ? customerJoin[0] : customerJoin;

    if (!customer) {
      continue;
    }

    const daysRemaining = daysUntilContractEnd(site.contract_end, todayKey);

    rows.push({
      siteId: site.id,
      siteName: site.name || "Site",
      customerId: customer.id,
      customerName: customer.company_name || "Unknown customer",
      contactName: customer.contact_name,
      telephone: customer.telephone,
      email: customer.email,
      supplier: site.current_supplier,
      contractEnd: site.contract_end,
      contractEndLabel: formatDisplayDate(site.contract_end),
      daysRemaining,
      isOverdue: daysRemaining < 0,
      urgencyBand: urgencyBandForDays(daysRemaining),
    });
  }

  const summary: RenewalIntelligenceSummary = {
    overdueCount: rows.filter((row) => row.isOverdue).length,
    within30Count: rows.filter((row) => !row.isOverdue && row.daysRemaining <= 30).length,
    within60Count: rows.filter((row) => !row.isOverdue && row.daysRemaining <= 60).length,
    within90Count: rows.filter((row) => !row.isOverdue && row.daysRemaining <= 90).length,
    within180Count: rows.filter((row) => !row.isOverdue && row.daysRemaining <= 180).length,
  };

  return { configured: true, summary, rows };
}
