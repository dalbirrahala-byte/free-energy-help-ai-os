import type { DemoQuoteSummary, QuoteDashboardBucket } from "./types";

export function buildDashboardCounts(
  quotes: DemoQuoteSummary[],
): Record<QuoteDashboardBucket, number> {
  const initial: Record<QuoteDashboardBucket, number> = {
    "Quotes awaiting pricing": 0,
    "Ready to send": 0,
    "Awaiting customer": 0,
    Accepted: 0,
    Lost: 0,
    Expired: 0,
  };

  for (const quote of quotes) {
    initial[quote.dashboardBucket] += 1;
  }

  return initial;
}
