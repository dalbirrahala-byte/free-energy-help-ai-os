import { createClient } from "@/lib/supabase/server";
import { loadMissionControlData } from "@/lib/dashboard/queries";
import {
  addDaysLocal,
  PIPELINE_STATUSES,
  RENEWAL_WARNING_DAYS,
  startOfTodayLocal,
  toDateKey,
} from "@/lib/dashboard/dates";
import { getDemoCommissionRecords } from "@/lib/commissions/demo-data";
import { buildOverviewMetrics } from "@/lib/commissions/calculations";
import { formatGbp } from "@/lib/commissions/alerts";
import { DEMO_REFERENCE_YEAR } from "@/lib/commissions/constants";
import { getExecutiveSummary } from "@/lib/decision-engine/demo-data";

import type { ExecutiveIntelligenceData } from "./types";

const NOT_CONFIGURED = "Not configured";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type CountResult = { ok: boolean; count: number | null };

async function safeCount(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<CountResult> {
  const { count, error } = await query;

  if (error) {
    return { ok: false, count: null };
  }

  return { ok: true, count: count ?? 0 };
}

function formatCount(result: CountResult): string {
  return !result.ok || result.count === null ? NOT_CONFIGURED : String(result.count);
}

const OPEN_PIPELINE_STATUSES: ReadonlySet<string> = new Set(
  PIPELINE_STATUSES.filter((status) => status !== "Won" && status !== "Lost"),
);

async function loadOpenPipelineCount(supabase: SupabaseClient): Promise<CountResult> {
  const { data, error } = await supabase.from("leads").select("status");

  if (error) {
    return { ok: false, count: null };
  }

  const openCount = (data ?? []).filter((row: { status: string | null }) =>
    OPEN_PIPELINE_STATUSES.has(row.status ?? "New"),
  ).length;

  return { ok: true, count: openCount };
}

export async function loadExecutiveIntelligenceData(): Promise<ExecutiveIntelligenceData> {
  const supabase = await createClient();
  const renewalUntil = toDateKey(addDaysLocal(startOfTodayLocal(), RENEWAL_WARNING_DAYS));

  const [missionControl, activeCustomers, renewalsDue, salesPipeline] = await Promise.all([
    loadMissionControlData(),
    safeCount(
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("status", "Active"),
    ),
    safeCount(
      supabase
        .from("customer_sites")
        .select("*", { count: "exact", head: true })
        .not("contract_end", "is", null)
        .lte("contract_end", renewalUntil),
    ),
    loadOpenPipelineCount(supabase),
  ]);

  const commissionOverview = buildOverviewMetrics(getDemoCommissionRecords(), "all", DEMO_REFERENCE_YEAR);
  const decisionSummary = getExecutiveSummary();

  return {
    cards: [
      {
        id: "active-customers",
        title: "Active Customers",
        value: formatCount(activeCustomers),
        hint: "Customers with status = Active",
        source: "live",
      },
      {
        id: "renewals-due",
        title: "Renewals Due",
        value: formatCount(renewalsDue),
        hint: `Contract end within ${RENEWAL_WARNING_DAYS} days`,
        source: "live",
      },
      {
        id: "sales-pipeline",
        title: "Sales Pipeline",
        value: formatCount(salesPipeline),
        hint: "Open leads across active pipeline stages",
        source: "live",
      },
      {
        id: "expected-commission",
        title: "Expected Commission",
        value: formatGbp(commissionOverview.expectedCommission),
        hint: "Forecasted commission (demo commission ledger)",
        source: "demo",
      },
      {
        id: "high-risk-customers",
        title: "High Risk Customers",
        value: decisionSummary.highRiskCustomers,
        hint: "Flagged by the decision engine",
        source: "demo",
      },
      {
        id: "ai-recommendations",
        title: "AI Recommendations",
        value: decisionSummary.highPriorityRecommendations,
        hint: "High-priority recommendations awaiting review",
        source: "demo",
      },
      {
        id: "todays-tasks",
        title: "Today's Tasks",
        value: missionControl.kpis.tasksDueToday,
        hint: "Tasks due today across the team",
        source: "live",
      },
      {
        id: "recent-activity",
        title: "Recent Activity",
        value: String(missionControl.recentActivity.length),
        hint: "Most recently logged activities",
        source: "live",
      },
    ],
  };
}
