import { createClient } from "@/lib/supabase/server";

import {
  buildRenewalsDueLabel,
  classifyRenewalActionUrgency,
  countOpenTasks,
  countOverdueTasks,
  daysUntil,
  displayValue,
  formatUkDate,
  formatUkDateTime,
  renewalCountdownLabel,
} from "./analytics";
import {
  classifyRenewalWorkflowLane,
  renewalWorkflowNextStep,
  renewalWorkflowReason,
} from "./renewal-workflow";
import { demoExecutiveOverlay, getDemoModulesForCustomer } from "./demo-data";
import type {
  Activity360Row,
  Contact360Row,
  Customer360Alert,
  Customer360View,
  DataGapWarning,
  RenewalActionWorkspace,
  Site360Row,
  Task360Row,
  Timeline360Entry,
} from "./types";

type CustomerRow = {
  id: number;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  status: string | null;
  notes: string | null;
  source_lead_id: number | null;
};

type SiteRow = {
  id: number;
  name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  is_primary: boolean | null;
  current_supplier: string | null;
  contract_end: string | null;
};

type TaskRow = {
  id: number;
  title: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
};

type ActivityRow = {
  id: number;
  activity_type: string | null;
  title: string | null;
  details: string | null;
  activity_date: string | null;
  activity_time: string | null;
  created_at: string;
};

function primarySite(sites: SiteRow[]): SiteRow | null {
  if (sites.length === 0) {
    return null;
  }

  return sites.find((s) => s.is_primary) ?? sites[0];
}

function mapSites(sites: SiteRow[], demoElectric: string, demoGas: string): Site360Row[] {
  return sites.map((site) => ({
    id: site.id,
    source: "live",
    siteName: displayValue(site.name),
    address:
      [site.address_line1, site.address_line2, site.city].filter(Boolean).join(", ") ||
      "Not provided",
    postcode: displayValue(site.postcode),
    isPrimary: Boolean(site.is_primary),
    currentSupplier: displayValue(site.current_supplier),
    contractEnd: site.contract_end,
    contractEndLabel: formatUkDate(site.contract_end),
    electricityMeterCount: demoElectric,
    gasMeterCount: demoGas,
    status: site.contract_end ? "Active supply" : "Incomplete data",
  }));
}

function mapTasks(tasks: TaskRow[]): Task360Row[] {
  return tasks.map((task) => ({
    id: task.id,
    source: "live",
    title: displayValue(task.title),
    type: "Task",
    dueDate: task.due_date,
    dueDateLabel: formatUkDate(task.due_date),
    dueTime: task.due_time?.slice(0, 5) ?? "—",
    priority: displayValue(task.priority),
    status: displayValue(task.status),
    assignedUser: "Unassigned",
  }));
}

function mapActivities(activities: ActivityRow[]): Activity360Row[] {
  return activities.map((activity) => ({
    id: activity.id,
    source: "live",
    activityType: displayValue(activity.activity_type),
    title: displayValue(activity.title ?? activity.activity_type),
    details: activity.details?.trim() ? activity.details.trim() : "—",
    occurredLabel: formatUkDateTime(
      activity.activity_date ?? activity.created_at.slice(0, 10),
      activity.activity_time,
    ),
  }));
}

function buildContacts(
  customer: CustomerRow,
  demoAdditional: Contact360Row[],
): Contact360Row[] {
  const livePrimary: Contact360Row[] = [];

  if (
    customer.contact_name?.trim() ||
    customer.email?.trim() ||
    customer.telephone?.trim()
  ) {
    livePrimary.push({
      id: `live-primary-${customer.id}`,
      source: "live",
      name: displayValue(customer.contact_name),
      role: "Primary contact",
      telephone: displayValue(customer.telephone),
      email: displayValue(customer.email),
      isPrimary: true,
    });
  }

  return [...livePrimary, ...demoAdditional];
}

function buildLiveTimeline(
  customer: CustomerRow,
  activities: ActivityRow[],
): Timeline360Entry[] {
  const entries: Timeline360Entry[] = [
    {
      id: `live-created-${customer.id}`,
      source: "live",
      occurredAt: customer.created_at,
      occurredLabel: formatUkDate(customer.created_at.slice(0, 10)),
      category: "Customer created",
      summary: `${displayValue(customer.company_name)} added to CRM`,
    },
  ];

  if (customer.source_lead_id) {
    entries.push({
      id: `live-converted-${customer.id}`,
      source: "live",
      occurredAt: customer.created_at,
      occurredLabel: formatUkDate(customer.created_at.slice(0, 10)),
      category: "Lead converted",
      summary: `Converted from lead #${customer.source_lead_id}`,
    });
  }

  for (const activity of activities) {
    entries.push({
      id: `live-act-${activity.id}`,
      source: "live",
      occurredAt: activity.activity_date ?? activity.created_at,
      occurredLabel: formatUkDateTime(
        activity.activity_date ?? activity.created_at.slice(0, 10),
        activity.activity_time,
      ),
      category: activity.activity_type ?? "Activity",
      summary: displayValue(activity.title ?? activity.activity_type),
    });
  }

  return entries;
}

function buildAlerts(
  customer: CustomerRow,
  sites: SiteRow[],
  tasks: TaskRow[],
  activities: ActivityRow[],
  demo: ReturnType<typeof getDemoModulesForCustomer>,
): Customer360Alert[] {
  const alerts: Customer360Alert[] = [];
  const main = primarySite(sites);
  const renewalDays = daysUntil(main?.contract_end ?? null);

  if (renewalDays !== null && renewalDays >= 0 && renewalDays <= 90) {
    alerts.push({
      id: "alert-contract-expiring",
      type: "Contract expiring",
      message: `Primary site contract ends in ${renewalDays} days (${formatUkDate(main?.contract_end ?? null)}).`,
      source: "live",
      severity: renewalDays <= 30 ? "high" : "medium",
    });
  }

  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) {
      return false;
    }

    const days = daysUntil(t.due_date);
    const status = (t.status ?? "").toLowerCase();

    return days !== null && days < 0 && status !== "completed" && status !== "done";
  });

  if (overdueTasks.length > 0) {
    alerts.push({
      id: "alert-overdue-task",
      type: "Overdue task",
      message: `${overdueTasks.length} task(s) past due date.`,
      source: "live",
      severity: "high",
    });
  }

  if (!customer.email?.trim() || !customer.telephone?.trim()) {
    alerts.push({
      id: "alert-data-incomplete",
      type: "Data incomplete",
      message: "Primary contact email or telephone is missing.",
      source: "live",
      severity: "medium",
    });
  }

  if (activities.length === 0) {
    alerts.push({
      id: "alert-no-contact",
      type: "No recent contact",
      message: "No activities recorded for this customer.",
      source: "live",
      severity: "low",
    });
  }

  alerts.push({
    id: "alert-loa-demo",
    type: "Missing LOA",
    message: "LOA pending on demo document register.",
    source: "demo",
    severity: "medium",
  });

  alerts.push({
    id: "alert-quote-demo",
    type: "Quote expiring",
    message: "Demo quote QTE-DEMO-2026-014 expires soon.",
    source: "demo",
    severity: "medium",
  });

  alerts.push({
    id: "alert-commission-demo",
    type: "Commission overdue",
    message: "Demo commission row shows outstanding expected amount.",
    source: "demo",
    severity: "low",
  });

  if (demo.electricityMeters.length === 0) {
    alerts.push({
      id: "alert-meter-demo",
      type: "Missing meter information",
      message: "No demo electricity meters on register.",
      source: "demo",
      severity: "low",
    });
  }

  return alerts;
}

function buildRenewalActionWorkspace(
  customer: CustomerRow,
  mainSite: SiteRow | null,
  sites: SiteRow[],
  tasks: TaskRow[],
  activities: ActivityRow[],
  renewalDays: number | null,
  latestActivity: ActivityRow | undefined,
): RenewalActionWorkspace {
  const urgency = classifyRenewalActionUrgency(renewalDays);
  const overdueTaskCount = countOverdueTasks(tasks);
  const openTaskCount = countOpenTasks(tasks);

  const dataGaps: DataGapWarning[] = [];

  if (!mainSite?.contract_end) {
    dataGaps.push({
      id: "gap-contract-end",
      message: "Contract end date is not recorded.",
    });
  }

  if (!mainSite?.current_supplier?.trim()) {
    dataGaps.push({
      id: "gap-supplier",
      message: "Current supplier is not recorded.",
    });
  }

  if (!customer.contact_name?.trim()) {
    dataGaps.push({
      id: "gap-contact",
      message: "Primary contact name is missing.",
    });
  }

  if (!customer.telephone?.trim()) {
    dataGaps.push({
      id: "gap-telephone",
      message: "Telephone number is missing.",
    });
  }

  if (!customer.email?.trim()) {
    dataGaps.push({
      id: "gap-email",
      message: "Email address is missing.",
    });
  }

  if (sites.length === 0) {
    dataGaps.push({
      id: "gap-site",
      message: "No site is recorded for this customer.",
    });
  }

  // Keep Phase 3 lane classification aligned with the renewal queue's six
  // required customer/site fields. Activity absence remains visible context.
  const workflowDataGapCount = dataGaps.length;

  if (activities.length === 0) {
    dataGaps.push({
      id: "gap-activity",
      message: "No activity has been recorded for this customer.",
    });
  }

  if (overdueTaskCount > 0) {
    dataGaps.push({
      id: "gap-overdue-tasks",
      message: `${overdueTaskCount} task(s) are overdue.`,
    });
  }

  const workflowInput = {
    urgency,
    daysUntilEnd: renewalDays,
    openTaskCount,
    overdueTaskCount,
    dataGapCount: workflowDataGapCount,
  };
  const workflowLane = classifyRenewalWorkflowLane(workflowInput);
  const nextStep = renewalWorkflowNextStep(workflowInput, workflowLane);

  return {
    source: "live",
    companyName: displayValue(customer.company_name),
    primaryContact: displayValue(customer.contact_name),
    telephone: displayValue(customer.telephone),
    email: displayValue(customer.email),
    primarySiteName: displayValue(mainSite?.name),
    currentSupplier: displayValue(mainSite?.current_supplier),
    contractEndLabel: formatUkDate(mainSite?.contract_end ?? null),
    renewalCountdownLabel: renewalCountdownLabel(renewalDays),
    daysUntilEnd: renewalDays,
    urgency,
    workflowLane,
    workflowReason: renewalWorkflowReason(workflowInput, workflowLane),
    suggestedNextAction: nextStep.action,
    suggestedNextActionReason: nextStep.reason,
    dataGaps,
    openTaskCount,
    overdueTaskCount,
    latestActivitySummary: latestActivity
      ? `${displayValue(latestActivity.title ?? latestActivity.activity_type)} (${formatUkDateTime(
          latestActivity.activity_date ?? latestActivity.created_at.slice(0, 10),
          latestActivity.activity_time,
        )})`
      : "No live activities recorded",
  };
}

export async function loadCustomer360(
  customerId: number,
): Promise<Customer360View | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, created_at, company_name, contact_name, telephone, email, status, notes, source_lead_id",
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const customer = data as CustomerRow;

  const { data: sitesData } = await supabase
    .from("customer_sites")
    .select(
      "id, name, address_line1, address_line2, city, postcode, is_primary, current_supplier, contract_end",
    )
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("id, title, due_date, due_time, priority, status, notes")
    .eq("customer_id", customerId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });

  const { data: activitiesData } = await supabase
    .from("activities")
    .select(
      "id, activity_type, title, details, activity_date, activity_time, created_at",
    )
    .eq("customer_id", customerId)
    .order("activity_date", { ascending: false })
    .order("activity_time", { ascending: false });

  const sites = (sitesData ?? []) as SiteRow[];
  const tasks = (tasksData ?? []) as TaskRow[];
  const activities = (activitiesData ?? []) as ActivityRow[];
  const mainSite = primarySite(sites);
  const demo = getDemoModulesForCustomer(customerId);
  const execDemo = demoExecutiveOverlay(customerId);
  const renewalDays = daysUntil(mainSite?.contract_end ?? null);

  const liveTimeline = buildLiveTimeline(customer, activities);
  const mergedTimeline = [...liveTimeline, ...demo.timelineDemo].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );

  const taskRows = mapTasks(tasks);
  const activityRows = mapActivities(activities);
  const contactRows = buildContacts(customer, demo.additionalContacts);
  const latestActivity = activities[0];
  const upcomingTask = tasks.find(
    (t) => (t.status ?? "Open").toLowerCase() !== "completed",
  );

  return {
    customerId,
    header: {
      companyName: displayValue(customer.company_name),
      tradingStatus: displayValue(customer.status),
      primaryContact: displayValue(customer.contact_name),
      telephone: displayValue(customer.telephone),
      email: displayValue(customer.email),
      accountManager: execDemo.accountManager,
      accountManagerSource: "demo",
      currentSupplier: displayValue(mainSite?.current_supplier),
      contractEndDate: mainSite?.contract_end ?? null,
      contractEndLabel: formatUkDate(mainSite?.contract_end ?? null),
      renewalCountdownDays: renewalDays,
      renewalCountdownLabel: renewalCountdownLabel(renewalDays),
      siteCount: sites.length,
      customerSince: customer.created_at,
      customerSinceLabel: formatUkDate(customer.created_at.slice(0, 10)),
      riskStatus: execDemo.riskStatus,
      aiOpportunityScore: execDemo.aiOpportunityScore,
      expectedDemoCommission: execDemo.expectedDemoCommission,
      sourceLeadId: customer.source_lead_id,
    },
    summary: {
      activeContracts: execDemo.activeContracts,
      sites: String(sites.length),
      electricityMeters: execDemo.electricityMeters,
      gasMeters: execDemo.gasMeters,
      openQuotes: execDemo.openQuotes,
      tasksDue: String(countOpenTasks(tasks)),
      renewalsDue: buildRenewalsDueLabel(
        sites.map((s) => s.contract_end),
        execDemo.renewalsDueCount,
      ),
      outstandingDemoCommission: execDemo.outstandingDemoCommission,
    },
    alerts: buildAlerts(customer, sites, tasks, activities, demo),
    sites: mapSites(sites, execDemo.electricityMeters, execDemo.gasMeters),
    tasks: taskRows,
    contacts: contactRows,
    activities: activityRows,
    liveNotes: customer.notes,
    renewalAction: buildRenewalActionWorkspace(
      customer,
      mainSite,
      sites,
      tasks,
      activities,
      renewalDays,
      latestActivity,
    ),
    overview: {
      profileSummary: `${displayValue(customer.company_name)} — ${displayValue(customer.status)} trading status.`,
      primarySiteName: displayValue(mainSite?.name),
      primarySiteAddress:
        [mainSite?.address_line1, mainSite?.postcode].filter(Boolean).join(", ") ||
        "Not provided",
      supplyPosition: `${displayValue(mainSite?.current_supplier)} · ends ${formatUkDate(mainSite?.contract_end ?? null)}`,
      latestActivitySummary: latestActivity
        ? `${displayValue(latestActivity.title ?? latestActivity.activity_type)} (${formatUkDateTime(
            latestActivity.activity_date ?? latestActivity.created_at.slice(0, 10),
            latestActivity.activity_time,
          )})`
        : "No live activities recorded",
      upcomingTasksSummary: upcomingTask
        ? `${displayValue(upcomingTask.title)} due ${formatUkDate(upcomingTask.due_date)}`
        : "No open tasks",
      renewalSummary: renewalCountdownLabel(renewalDays),
      openQuoteSummary: `${execDemo.openQuotes} on demo register`,
      commissionSummary: execDemo.expectedDemoCommission,
    },
    demo,
    timeline: mergedTimeline,
  };
}
