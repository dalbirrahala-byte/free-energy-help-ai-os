export type TableAvailability = {
  leads: boolean;
  customers: boolean;
  sites: boolean;
  tasks: boolean;
  activities: boolean;
};

export type PipelineStage = {
  status: string;
  count: number;
  widthPercent: number;
};

export type DashboardTask = {
  id: number;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  status: string | null;
  leadId: number | null;
  kind: "today" | "overdue" | "upcoming";
};

export type FollowUpLead = {
  id: number;
  companyName: string;
  status: string | null;
};

export type RenewalRow = {
  siteId: number;
  siteName: string;
  customerName: string;
  supplier: string | null;
  contractEnd: string;
};

export type RecentLead = {
  id: number;
  companyName: string;
  createdAt: string;
  status: string | null;
};

export type RecentCustomer = {
  id: number;
  companyName: string;
  createdAt: string;
  status: string | null;
};

export type ActivityFeedItem = {
  id: number;
  title: string;
  activityType: string | null;
  occurredLabel: string;
  leadId: number | null;
  customerId: number | null;
};

export type FactoryOpsInfo = {
  documentationStatus: string;
  currentTask: string;
  waitingApproval: string[];
  milestone: string;
};

export type MissionControlData = {
  supabaseConnected: boolean;
  environmentLabel: string;
  tables: TableAvailability;
  kpis: {
    totalLeads: string;
    totalCustomers: string;
    quotes: string;
    tasksDueToday: string;
    renewalsDue: string;
    aiStatus: string;
  };
  pipeline: PipelineStage[];
  pipelineConfigured: boolean;
  todaysTasks: DashboardTask[];
  overdueTasks: DashboardTask[];
  upcomingTasks: DashboardTask[];
  followUpLeads: FollowUpLead[];
  renewals: RenewalRow[];
  recentLeads: RecentLead[];
  recentCustomers: RecentCustomer[];
  recentActivity: ActivityFeedItem[];
  factoryOps: FactoryOpsInfo;
  dataAvailabilitySummary: string;
};
