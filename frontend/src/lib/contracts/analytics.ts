import { DEMO_AS_OF_DATE } from "./constants";
import type { DemoContractRecord, RenewalTimelineBucket } from "./types";

export function formatUkDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

export function daysRemaining(endDate: string, asOf = DEMO_AS_OF_DATE): number {
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`);
  const ref = new Date(`${asOf}T00:00:00`);
  const diff = end.getTime() - ref.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function daysRemainingLabel(endDate: string, status: DemoContractRecord["status"]): string {
  if (status === "Expired" || status === "Lost" || status === "Terminated") {
    return "—";
  }

  const days = daysRemaining(endDate);

  if (days < 0) {
    return `${Math.abs(days)} days overdue (demo)`;
  }

  if (days === 0) {
    return "Due today (demo)";
  }

  return `${days} days (demo)`;
}

export function assignRenewalBucket(record: DemoContractRecord): RenewalTimelineBucket {
  if (record.status === "Expired") {
    return "Expired";
  }

  const days = daysRemaining(record.endDate);

  if (record.status === "Lost" || record.status === "Terminated") {
    return "Expired";
  }

  if (days < 0 && record.status !== "Draft") {
    return "Overdue";
  }

  if (days === 0) {
    return "Due today";
  }

  if (days <= 30) {
    return "Within 30 days";
  }

  if (days <= 60) {
    return "Within 60 days";
  }

  if (days <= 90) {
    return "Within 90 days";
  }

  return "Later";
}

export function buildRenewalTimelineGroups(
  records: DemoContractRecord[],
): { bucket: RenewalTimelineBucket; contracts: DemoContractRecord[] }[] {
  const buckets: RenewalTimelineBucket[] = [
    "Overdue",
    "Due today",
    "Within 30 days",
    "Within 60 days",
    "Within 90 days",
    "Later",
    "Expired",
  ];

  return buckets.map((bucket) => ({
    bucket,
    contracts: records.filter((r) => assignRenewalBucket(r) === bucket),
  }));
}

export function buildContractDashboardKpis(records: DemoContractRecord[]) {
  const active = records.filter((r) => r.status === "Live" || r.status === "Renewal due");
  const liveEnds = active.map((r) => daysRemaining(r.endDate));

  const due30 = liveEnds.filter((d) => d >= 0 && d <= 30).length;
  const due60 = liveEnds.filter((d) => d >= 0 && d <= 60).length;
  const due90 = liveEnds.filter((d) => d >= 0 && d <= 90).length;

  const outOfContract = records.filter(
    (r) => r.status === "Expired" || r.status === "Renewal due",
  ).length;

  const signedThisMonth = records.filter(
    (r) => r.startDate.startsWith("2026-07") && (r.status === "Live" || r.status === "Submitted"),
  ).length;

  const lost = records.filter((r) => r.status === "Lost").length;

  const retained = active.reduce((sum, r) => {
    const numeric = Number(r.estimatedAnnualSpend.replace(/[^0-9.]/g, ""));
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);

  return {
    activeContracts: `${active.length} (demo)`,
    due30: String(due30),
    due60: String(due60),
    due90: String(due90),
    outOfContract: `${outOfContract} (demo)`,
    signedThisMonth: String(signedThisMonth),
    lostContracts: String(lost),
    demoRetainedRevenue: `£${retained.toLocaleString("en-GB")} (demo)`,
  };
}
