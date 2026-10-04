import { buildDailyAssistantBrief, type DailyAssistantBrief } from "../daily-assistant/dailyAssistant.ts";
import type { PipelineStage, PriorityAction } from "../dashboard/types.ts";

export type GrowthDataSourceState = "LIVE" | "PARTIAL" | "NOT_CONNECTED";

export type GrowthDataSource = Readonly<{
  id: "crm" | "website" | "paid_ads" | "social" | "seo_aeo" | "apollo";
  label: string;
  state: GrowthDataSourceState;
  detail: string;
}>;

export type GrowthControlModel = Readonly<{
  briefing: DailyAssistantBrief;
  kpis: readonly Readonly<{ id: string; label: string; value: string; hint: string }>[]; 
  pipeline: Readonly<{
    total: number;
    won: number;
    lost: number;
    open: number;
  }>;
  dataSources: readonly GrowthDataSource[];
}>;

export function buildGrowthControlModel(input: {
  hourLocal: number;
  kpis: Readonly<{
    totalLeads: string;
    totalCustomers: string;
    tasksDueToday: string;
    renewalsDue: string;
  }>;
  pipeline: readonly PipelineStage[];
  priorityActions: readonly PriorityAction[];
  sourceState: Readonly<{
    crmLive: boolean;
    tasksLive: boolean;
    followUpLive: boolean;
    renewalsLive: boolean;
  }>;
}): GrowthControlModel {
  const briefing = buildDailyAssistantBrief({
    hourLocal: input.hourLocal,
    priorityActions: input.priorityActions,
    sourceState: {
      overdueTasksAvailable: input.sourceState.tasksLive,
      followUpLeadsAvailable: input.sourceState.followUpLive,
      renewalsAvailable: input.sourceState.renewalsLive,
    },
  });

  const pipelineCounts = new Map(input.pipeline.map((stage) => [stage.status.toLowerCase(), stage.count]));
  const total = input.pipeline.reduce((sum, stage) => sum + stage.count, 0);
  const won = pipelineCounts.get("won") ?? 0;
  const lost = pipelineCounts.get("lost") ?? 0;
  const open = Math.max(total - won - lost, 0);

  const dataSources: GrowthDataSource[] = [
    {
      id: "crm",
      label: "CRM",
      state: input.sourceState.crmLive ? "LIVE" : "PARTIAL",
      detail: input.sourceState.crmLive
        ? "Live CRM facts are available to Mission Control."
        : "CRM facts are only partially available.",
    },
    {
      id: "website",
      label: "Website & Health Check",
      state: "NOT_CONNECTED",
      detail: "No web-analytics performance feed is wired into Mission Control yet.",
    },
    {
      id: "paid_ads",
      label: "Paid Ads",
      state: "NOT_CONNECTED",
      detail: "No live ad-spend or cost-per-qualified-opportunity feed is wired in yet.",
    },
    {
      id: "social",
      label: "Social",
      state: "NOT_CONNECTED",
      detail: "No live engagement or social-attribution feed is wired into this dashboard yet.",
    },
    {
      id: "seo_aeo",
      label: "SEO / AEO",
      state: "NOT_CONNECTED",
      detail: "No live search-visibility or AI-search analytics feed is wired in yet.",
    },
    {
      id: "apollo",
      label: "Apollo / Outbound",
      state: "NOT_CONNECTED",
      detail: "No Apollo execution or spend feed is wired into Mission Control; outbound authority remains separate.",
    },
  ];

  return Object.freeze({
    briefing,
    kpis: Object.freeze([
      Object.freeze({ id: "leads", label: "CRM leads", value: input.kpis.totalLeads, hint: "Live CRM count" }),
      Object.freeze({ id: "customers", label: "Customers", value: input.kpis.totalCustomers, hint: "Live CRM count" }),
      Object.freeze({ id: "tasks", label: "Tasks due today", value: input.kpis.tasksDueToday, hint: "Attention today" }),
      Object.freeze({ id: "renewals", label: "Renewals due", value: input.kpis.renewalsDue, hint: "Within 90 days" }),
    ]),
    pipeline: Object.freeze({ total, won, lost, open }),
    dataSources: Object.freeze(dataSources.map((source) => Object.freeze(source))),
  });
}
