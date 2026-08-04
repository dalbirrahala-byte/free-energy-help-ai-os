export type Tone = "positive" | "warning" | "critical" | "neutral";

export type IntelligenceMetric = {
  label: string;
  value: number | null;
  displayValue: string;
  badge: string;
  tone: Tone;
  explanation: string;
  /** Present only when this metric is incomplete — exactly which fields are needed. */
  missingFields?: string[];
};

export type LeadRecord = {
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contract_end: string | null;
  status: string | null;
};

export type EngagementActivity = { activity_date: string | null };
export type EngagementTask = { due_date: string | null; status: string | null };

export type CommercialEnergyIntelligence = {
  renewalUrgency: IntelligenceMetric;
  daysRemaining: IntelligenceMetric;
  leadQualityScore: IntelligenceMetric;
  dataCompleteness: IntelligenceMetric;
  customerHealth: IntelligenceMetric;
  engagementStatus: IntelligenceMetric;
  quoteReadiness: IntelligenceMetric;
  commercialOpportunity: IntelligenceMetric;
  commissionReadiness: IntelligenceMetric;
};

const QUALIFIED_STATUSES: readonly string[] = ["Qualified", "Quote Sent", "Negotiation", "Won"];
const RENEWAL_URGENT_DAYS = 90;
const RENEWAL_APPROACHING_DAYS = 180;
const ENGAGEMENT_RECENT_DAYS = 14;

function hasText(value: string | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

function isQualified(status: string | null): boolean {
  return Boolean(status && QUALIFIED_STATUSES.includes(status));
}

/** Whole days between `today` and a YYYY-MM-DD date key. Negative = in the past. */
function daysUntil(dateKey: string | null, today: Date): number | null {
  if (!dateKey) {
    return null;
  }

  const target = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - start.getTime()) / msPerDay);
}

function mostRecentDate(dates: Array<string | null>): string | null {
  const valid = dates.filter((date): date is string => Boolean(date));
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((latest, current) => (current > latest ? current : latest));
}

function todayKey(today: Date): string {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcRenewalUrgency(lead: LeadRecord, today: Date): IntelligenceMetric {
  const days = daysUntil(lead.contract_end, today);

  if (days === null) {
    return {
      label: "Renewal Urgency",
      value: null,
      displayValue: "Unknown",
      badge: "Unknown",
      tone: "neutral",
      explanation: "No contract end date is on file for this lead.",
      missingFields: ["Contract end date"],
    };
  }

  if (days <= RENEWAL_URGENT_DAYS) {
    return {
      label: "Renewal Urgency",
      value: days,
      displayValue: days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`,
      badge: "Urgent",
      tone: "critical",
      explanation:
        days < 0
          ? `Contract end date was ${Math.abs(days)} day(s) ago and needs immediate attention.`
          : `Contract ends in ${days} day(s), within the ${RENEWAL_URGENT_DAYS}-day urgent window.`,
    };
  }

  if (days <= RENEWAL_APPROACHING_DAYS) {
    return {
      label: "Renewal Urgency",
      value: days,
      displayValue: `${days} days`,
      badge: "Approaching",
      tone: "warning",
      explanation: `Contract ends in ${days} day(s), within the ${RENEWAL_APPROACHING_DAYS}-day approaching window.`,
    };
  }

  return {
    label: "Renewal Urgency",
    value: days,
    displayValue: `${days} days`,
    badge: "Future",
    tone: "positive",
    explanation: `Contract ends in ${days} day(s), more than ${RENEWAL_APPROACHING_DAYS} days away.`,
  };
}

function calcDaysRemaining(lead: LeadRecord, today: Date): IntelligenceMetric {
  const days = daysUntil(lead.contract_end, today);

  if (days === null) {
    return {
      label: "Days Remaining",
      value: null,
      displayValue: "Unknown",
      badge: "Unknown",
      tone: "neutral",
      explanation: "No contract end date is on file, so a countdown cannot be shown.",
      missingFields: ["Contract end date"],
    };
  }

  const badge =
    days < 0 ? "Overdue" : days <= RENEWAL_URGENT_DAYS ? "Urgent" : days <= RENEWAL_APPROACHING_DAYS ? "Approaching" : "Future";
  const tone: Tone = days < 0 || days <= RENEWAL_URGENT_DAYS ? "critical" : days <= RENEWAL_APPROACHING_DAYS ? "warning" : "positive";

  return {
    label: "Days Remaining",
    value: days,
    displayValue: days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`,
    badge,
    tone,
    explanation:
      days < 0
        ? `The on-file contract end date passed ${Math.abs(days)} day(s) ago.`
        : `${days} day(s) remain until the on-file contract end date.`,
  };
}

function calcLeadQualityScore(lead: LeadRecord): IntelligenceMetric {
  const rules: Array<{ met: boolean; points: number; field: string }> = [
    { met: hasText(lead.company_name), points: 10, field: "Company name" },
    { met: hasText(lead.contact_name), points: 10, field: "Contact name" },
    { met: hasText(lead.telephone), points: 10, field: "Telephone" },
    { met: hasText(lead.email), points: 10, field: "Email address" },
    { met: hasText(lead.supplier), points: 10, field: "Current supplier" },
    { met: hasText(lead.contract_end), points: 20, field: "Contract end date" },
    { met: isQualified(lead.status), points: 20, field: "Qualified status" },
  ];

  const rawScore = rules.reduce((sum, rule) => sum + (rule.met ? rule.points : 0), 0);
  const score = Math.min(rawScore, 100);
  const missingFields = rules.filter((rule) => !rule.met).map((rule) => rule.field);

  const badge = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const tone: Tone = score >= 70 ? "positive" : score >= 40 ? "warning" : "critical";

  return {
    label: "Lead Quality Score",
    value: score,
    displayValue: `${score}/100`,
    badge,
    tone,
    explanation:
      "Based on contact details, energy details, and pipeline status on file. Maximum achievable today is 90/100 — leads do not yet capture an address or postcode.",
    missingFields: missingFields.length > 0 ? missingFields : undefined,
  };
}

function calcDataCompleteness(lead: LeadRecord): IntelligenceMetric {
  const fields: Array<{ present: boolean; label: string }> = [
    { present: hasText(lead.company_name), label: "Company name" },
    { present: hasText(lead.contact_name), label: "Contact name" },
    { present: hasText(lead.telephone), label: "Telephone" },
    { present: hasText(lead.email), label: "Email address" },
    { present: hasText(lead.supplier), label: "Current supplier" },
    { present: hasText(lead.contract_end), label: "Contract end date" },
  ];

  const presentCount = fields.filter((field) => field.present).length;
  const percent = Math.round((presentCount / fields.length) * 100);
  const missingFields = fields.filter((field) => !field.present).map((field) => field.label);

  const badge = percent >= 80 ? "High" : percent >= 50 ? "Medium" : "Low";
  const tone: Tone = percent >= 80 ? "positive" : percent >= 50 ? "warning" : "critical";

  return {
    label: "Data Completeness",
    value: percent,
    displayValue: `${percent}%`,
    badge,
    tone,
    explanation: `${presentCount} of ${fields.length} important fields are on file.`,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
  };
}

function calcCustomerHealth(lead: LeadRecord, hasEngagement: boolean, hasOverdueTask: boolean): IntelligenceMetric {
  const checks: Array<{ met: boolean; label: string }> = [
    { met: hasEngagement, label: "At least one activity or task on file" },
    { met: !hasOverdueTask, label: "No overdue follow-up tasks" },
    { met: isQualified(lead.status), label: "Status progressed beyond New/Contacted" },
  ];

  const metCount = checks.filter((check) => check.met).length;
  const percent = Math.round((metCount / checks.length) * 100);
  const missing = checks.filter((check) => !check.met).map((check) => check.label);

  const badge = percent >= 67 ? "Healthy" : percent >= 34 ? "Needs Attention" : "At Risk";
  const tone: Tone = percent >= 67 ? "positive" : percent >= 34 ? "warning" : "critical";

  return {
    label: "Customer Health",
    value: percent,
    displayValue: `${metCount}/${checks.length} signals`,
    badge,
    tone,
    explanation: `${metCount} of ${checks.length} health signals are positive for this lead.`,
    missingFields: missing.length > 0 ? missing : undefined,
  };
}

function calcEngagementStatus(
  activityCount: number,
  taskCount: number,
  mostRecentActivity: string | null,
  today: Date,
): IntelligenceMetric {
  if (activityCount === 0 && taskCount === 0) {
    return {
      label: "Engagement Status",
      value: null,
      displayValue: "None",
      badge: "No Engagement Recorded",
      tone: "critical",
      explanation: "No activities or follow-up tasks have been logged for this lead.",
      missingFields: ["Activity or task record"],
    };
  }

  const daysSince = daysUntil(mostRecentActivity, today);
  const isRecent = daysSince !== null && daysSince >= -ENGAGEMENT_RECENT_DAYS;

  if (isRecent) {
    return {
      label: "Engagement Status",
      value: daysSince,
      displayValue: `${Math.abs(daysSince ?? 0)} days ago`,
      badge: "Active",
      tone: "positive",
      explanation: `Last activity was recorded ${Math.abs(daysSince ?? 0)} day(s) ago, within the ${ENGAGEMENT_RECENT_DAYS}-day follow-up window.`,
    };
  }

  if (activityCount > 0) {
    return {
      label: "Engagement Status",
      value: daysSince,
      displayValue: daysSince !== null ? `${Math.abs(daysSince)} days ago` : "Unknown",
      badge: "Needs Follow-up",
      tone: "warning",
      explanation:
        daysSince !== null
          ? `Last activity was recorded ${Math.abs(daysSince)} day(s) ago, outside the ${ENGAGEMENT_RECENT_DAYS}-day follow-up window.`
          : "Activities are recorded but none have a usable date.",
    };
  }

  return {
    label: "Engagement Status",
    value: taskCount,
    displayValue: `${taskCount} task(s)`,
    badge: "Follow-up Scheduled",
    tone: "warning",
    explanation: `${taskCount} task(s) are scheduled for this lead, but no activity has been logged yet.`,
  };
}

function calcQuoteReadiness(lead: LeadRecord): IntelligenceMetric {
  const checks: Array<{ met: boolean; label: string }> = [
    { met: hasText(lead.telephone) || hasText(lead.email), label: "Telephone or email address" },
    { met: hasText(lead.contract_end), label: "Contract end date" },
    { met: hasText(lead.supplier), label: "Current supplier" },
    { met: isQualified(lead.status), label: "Qualified status" },
  ];

  const metCount = checks.filter((check) => check.met).length;
  const percent = Math.round((metCount / checks.length) * 100);
  const missing = checks.filter((check) => !check.met).map((check) => check.label);

  const badge = percent === 100 ? "Ready" : percent >= 50 ? "Partially Ready" : "Not Ready";
  const tone: Tone = percent === 100 ? "positive" : percent >= 50 ? "warning" : "critical";

  return {
    label: "Quote Readiness",
    value: percent,
    displayValue: `${metCount}/${checks.length} checks`,
    badge,
    tone,
    explanation: `${metCount} of ${checks.length} quote-readiness checks are met.`,
    missingFields: missing.length > 0 ? missing : undefined,
  };
}

function calcCommercialOpportunity(): IntelligenceMetric {
  return {
    label: "Commercial Opportunity",
    value: null,
    displayValue: "Not enough data",
    badge: "Not enough data",
    tone: "neutral",
    explanation:
      "Electricity and gas annual usage are not yet captured on the lead record, so no genuine opportunity figure can be calculated. Consumption is not estimated in V1.",
    missingFields: ["Electricity annual usage", "Gas annual usage"],
  };
}

function calcCommissionReadiness(lead: LeadRecord): IntelligenceMetric {
  const checks: Array<{ met: boolean; label: string }> = [
    { met: isQualified(lead.status), label: "Qualified status" },
    { met: hasText(lead.contract_end), label: "Contract end date" },
    { met: hasText(lead.supplier), label: "Current supplier" },
  ];

  const metCount = checks.filter((check) => check.met).length;
  const percent = Math.round((metCount / checks.length) * 100);
  const missing = checks.filter((check) => !check.met).map((check) => check.label);

  const badge = percent === 100 ? "Administratively Ready" : percent > 0 ? "Partially Ready" : "Not Ready";
  const tone: Tone = percent === 100 ? "positive" : percent > 0 ? "warning" : "critical";

  return {
    label: "Commission Readiness",
    value: percent,
    displayValue: `${metCount}/${checks.length} checks`,
    badge,
    tone,
    explanation:
      "Checks whether the administrative prerequisites for commission tracking are on file. This does not calculate a commission figure — that would also require annual usage data, which is not yet captured.",
    missingFields: missing.length > 0 ? missing : undefined,
  };
}

/**
 * V1 Commercial Energy Intelligence Engine.
 *
 * Reads only the lead record and the activities/tasks already loaded by the
 * lead details page — no new Supabase queries, no schema changes, no AI
 * providers. Every metric returns a genuine calculation from on-file data;
 * where the schema doesn't yet capture what's needed (address/postcode,
 * fuel usage), the metric says so explicitly rather than guessing.
 */
export function calculateCommercialEnergyIntelligence(
  lead: LeadRecord,
  activities: EngagementActivity[],
  tasks: EngagementTask[],
  today: Date = new Date(),
): CommercialEnergyIntelligence {
  const activityCount = activities.length;
  const taskCount = tasks.length;
  const hasEngagement = activityCount > 0 || taskCount > 0;
  const mostRecentActivity = mostRecentDate(activities.map((activity) => activity.activity_date));
  const currentDateKey = todayKey(today);
  const hasOverdueTask = tasks.some(
    (task) =>
      task.due_date !== null &&
      task.due_date < currentDateKey &&
      task.status !== "Completed" &&
      task.status !== "Cancelled",
  );

  return {
    renewalUrgency: calcRenewalUrgency(lead, today),
    daysRemaining: calcDaysRemaining(lead, today),
    leadQualityScore: calcLeadQualityScore(lead),
    dataCompleteness: calcDataCompleteness(lead),
    customerHealth: calcCustomerHealth(lead, hasEngagement, hasOverdueTask),
    engagementStatus: calcEngagementStatus(activityCount, taskCount, mostRecentActivity, today),
    quoteReadiness: calcQuoteReadiness(lead),
    commercialOpportunity: calcCommercialOpportunity(),
    commissionReadiness: calcCommissionReadiness(lead),
  };
}
