import { createClient } from "@/lib/supabase/server";

import {
  FOLLOW_UP_DAYS,
  PIPELINE_STATUSES,
  RENEWAL_WARNING_DAYS,
  addDaysLocal,
  formatDateTimeLabel,
  startOfTodayLocal,
  toDateKey,
} from "./dates";
import { loadAiControlCentreStatus } from "@/lib/ai-control-centre/status";

import { loadFactoryOpsInfo } from "./factory-meta";
import type {
  ActivityFeedItem,
  DashboardTask,
  MissionControlData,
  PipelineStage,
  TableAvailability,
} from "./types";

const NOT_CONFIGURED = "Not configured";

function environmentLabel(): string {
  if (process.env.VERCEL_ENV) {
    return `Vercel: ${process.env.VERCEL_ENV}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

async function tableCount(
  table: keyof TableAvailability,
): Promise<{ ok: boolean; count: number | null }> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    return { ok: false, count: null };
  }

  return { ok: true, count: count ?? 0 };
}

function formatCount(count: number | null, tableOk: boolean): string {
  if (!tableOk || count === null) {
    return NOT_CONFIGURED;
  }

  return String(count);
}

function classifyTask(
  dueDate: string | null,
  status: string | null,
  todayKey: string,
): DashboardTask["kind"] | null {
  if (status === "Completed" || status === "Cancelled") {
    return null;
  }

  if (!dueDate) {
    return "upcoming";
  }

  if (dueDate < todayKey) {
    return "overdue";
  }

  if (dueDate === todayKey) {
    return "today";
  }

  return "upcoming";
}

function mapTask(row: {
  id: number;
  title: string | null;
  due_date: string | null;
  due_time: string | null;
  status: string | null;
  lead_id: number | null;
  customer_id?: number | null;
}): Omit<DashboardTask, "kind"> {
  return {
    id: row.id,
    title: row.title || "Untitled task",
    dueDate: row.due_date,
    dueTime: row.due_time,
    status: row.status,
    leadId: row.lead_id,
  };
}

export async function loadMissionControlData(): Promise<MissionControlData> {
  const supabase = await createClient();
  const today = startOfTodayLocal();
  const todayKey = toDateKey(today);
  const followUpSinceKey = toDateKey(addDaysLocal(today, -FOLLOW_UP_DAYS));
  const renewalUntilKey = toDateKey(addDaysLocal(today, RENEWAL_WARNING_DAYS));

  const probe = await supabase.from("leads").select("id").limit(1);
  const supabaseConnected = !probe.error;

  const [leadsTable, customersTable, sitesTable, tasksTable, activitiesTable] =
    await Promise.all([
      tableCount("leads"),
      tableCount("customers"),
      tableCount("sites"),
      tableCount("tasks"),
      tableCount("activities"),
    ]);

  const tables: TableAvailability = {
    leads: leadsTable.ok,
    customers: customersTable.ok,
    sites: sitesTable.ok,
    tasks: tasksTable.ok,
    activities: activitiesTable.ok,
  };

  let pipeline: PipelineStage[] = [];
  let pipelineConfigured = false;

  if (leadsTable.ok) {
    const { data: leadRows } = await supabase
      .from("leads")
      .select("status");

    const counts = new Map<string, number>();

    for (const status of PIPELINE_STATUSES) {
      counts.set(status, 0);
    }

    for (const row of leadRows ?? []) {
      const key = row.status || "New";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const max = Math.max(...Array.from(counts.values()), 1);

    pipeline = Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
      widthPercent: count === 0 ? 0 : Math.round((count / max) * 100),
    }));

    pipelineConfigured = true;
  }

  const todaysTasks: DashboardTask[] = [];
  const overdueTasks: DashboardTask[] = [];
  const upcomingTasks: DashboardTask[] = [];

  if (tasksTable.ok) {
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("id, title, due_date, due_time, status, lead_id")
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true });

    for (const row of taskRows ?? []) {
      const kind = classifyTask(row.due_date, row.status, todayKey);
      if (!kind) {
        continue;
      }

      const task: DashboardTask = { ...mapTask(row), kind };

      if (kind === "today") {
        todaysTasks.push(task);
      } else if (kind === "overdue") {
        overdueTasks.push(task);
      } else {
        upcomingTasks.push(task);
      }
    }

    upcomingTasks.splice(8);
  }

  const followUpLeads: MissionControlData["followUpLeads"] = [];

  if (leadsTable.ok && activitiesTable.ok) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, company_name, status");

    const { data: recentActivities } = await supabase
      .from("activities")
      .select("lead_id, activity_date")
      .not("lead_id", "is", null);

    const recentByLead = new Set<number>();

    for (const activity of recentActivities ?? []) {
      if (!activity.lead_id || !activity.activity_date) {
        continue;
      }

      if (activity.activity_date >= followUpSinceKey) {
        recentByLead.add(activity.lead_id);
      }
    }

    for (const lead of leads ?? []) {
      const status = lead.status || "New";
      if (status === "Won" || status === "Lost") {
        continue;
      }

      if (!recentByLead.has(lead.id)) {
        followUpLeads.push({
          id: lead.id,
          companyName: lead.company_name || "Unnamed company",
          status: lead.status,
        });
      }
    }

    followUpLeads.splice(8);
  }

  const renewals: MissionControlData["renewals"] = [];

  if (sitesTable.ok && customersTable.ok) {
    const { data: siteRows } = await supabase
      .from("sites")
      .select(
        "id, name, contract_end, current_supplier, customer_id, customers ( company_name )",
      )
      .not("contract_end", "is", null)
      .lte("contract_end", renewalUntilKey)
      .order("contract_end", { ascending: true });

    for (const site of siteRows ?? []) {
      if (!site.contract_end) {
        continue;
      }

      const customerJoin = site.customers as
        | { company_name: string | null }
        | { company_name: string | null }[]
        | null;

      const customerName = Array.isArray(customerJoin)
        ? customerJoin[0]?.company_name
        : customerJoin?.company_name;

      renewals.push({
        siteId: site.id,
        siteName: site.name || "Site",
        customerName: customerName || "Unknown customer",
        supplier: site.current_supplier,
        contractEnd: site.contract_end,
      });
    }

    renewals.splice(10);
  }

  const recentLeads: MissionControlData["recentLeads"] = [];

  if (leadsTable.ok) {
    const { data } = await supabase
      .from("leads")
      .select("id, company_name, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5);

    for (const row of data ?? []) {
      recentLeads.push({
        id: row.id,
        companyName: row.company_name || "Unnamed company",
        createdAt: row.created_at,
        status: row.status,
      });
    }
  }

  const recentCustomers: MissionControlData["recentCustomers"] = [];

  if (customersTable.ok) {
    const { data } = await supabase
      .from("customers")
      .select("id, company_name, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5);

    for (const row of data ?? []) {
      recentCustomers.push({
        id: row.id,
        companyName: row.company_name || "Unnamed company",
        createdAt: row.created_at,
        status: row.status,
      });
    }
  }

  const recentActivity: ActivityFeedItem[] = [];

  if (activitiesTable.ok) {
    const { data } = await supabase
      .from("activities")
      .select(
        "id, title, activity_type, activity_date, activity_time, created_at, lead_id, customer_id",
      )
      .order("created_at", { ascending: false })
      .limit(10);

    for (const row of data ?? []) {
      recentActivity.push({
        id: row.id,
        title: row.title || row.activity_type || "Activity",
        activityType: row.activity_type,
        occurredLabel: formatDateTimeLabel(
          row.activity_date,
          row.activity_time,
        ),
        leadId: row.lead_id,
        customerId: row.customer_id ?? null,
      });
    }
  }

  let renewalsDueCount: number | null = null;

  if (sitesTable.ok) {
    const { count } = await supabase
      .from("sites")
      .select("*", { count: "exact", head: true })
      .not("contract_end", "is", null)
      .lte("contract_end", renewalUntilKey);

    renewalsDueCount = count ?? 0;
  }

  let tasksDueTodayCount: number | null = null;

  if (tasksTable.ok) {
    tasksDueTodayCount = todaysTasks.length;
  }

  const factoryOps = await loadFactoryOpsInfo();
  const aiControlCentre = await loadAiControlCentreStatus(supabaseConnected);

  const availabilityParts: string[] = [];

  if (leadsTable.ok) {
    availabilityParts.push("leads");
  }

  if (customersTable.ok) {
    availabilityParts.push("customers");
  }

  if (sitesTable.ok) {
    availabilityParts.push("sites");
  }

  if (tasksTable.ok) {
    availabilityParts.push("tasks");
  }

  if (activitiesTable.ok) {
    availabilityParts.push("activities");
  }

  const dataAvailabilitySummary =
    availabilityParts.length > 0
      ? `Available: ${availabilityParts.join(", ")}`
      : NOT_CONFIGURED;

  return {
    supabaseConnected,
    environmentLabel: environmentLabel(),
    tables,
    kpis: {
      totalLeads: formatCount(leadsTable.count, leadsTable.ok),
      totalCustomers: formatCount(customersTable.count, customersTable.ok),
      quotes: NOT_CONFIGURED,
      tasksDueToday: formatCount(tasksDueTodayCount, tasksTable.ok),
      renewalsDue: formatCount(renewalsDueCount, sitesTable.ok),
    },
    aiControlCentre,
    pipeline,
    pipelineConfigured,
    todaysTasks,
    overdueTasks,
    upcomingTasks,
    followUpLeads,
    renewals,
    recentLeads,
    recentCustomers,
    recentActivity,
    factoryOps,
    dataAvailabilitySummary,
  };
}
