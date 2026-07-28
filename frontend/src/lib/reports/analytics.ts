import type { DateRangeOption } from "./types";
import { getExecutiveReportSnapshot } from "./demo-data";

export function getReportSnapshotForRange(range: DateRangeOption) {
  const base = getExecutiveReportSnapshot();
  const multiplier =
    range === "Today"
      ? 0.05
      : range === "This week"
        ? 0.18
        : range === "This month"
          ? 1
          : range === "This quarter"
            ? 2.8
            : range === "This year"
              ? 10
              : 1;

  if (multiplier === 1) {
    return base;
  }

  return {
    ...base,
    kpis: {
      ...base.kpis,
      monthlyRevenue: scaleCurrency(base.kpis.monthlyRevenue, multiplier),
      pipelineValue: scaleCurrency(base.kpis.pipelineValue, multiplier),
    },
    sales: {
      ...base.sales,
      quotesCreated: scaleCount(base.sales.quotesCreated, multiplier),
      conversionTrend: `${base.sales.conversionTrend} (${range} demo view)`,
    },
  };
}

function scaleCount(value: string, mult: number): string {
  const n = Number(value.match(/\d+/)?.[0] ?? 0);
  return `${Math.max(1, Math.round(n * mult))} (demo)`;
}

function scaleCurrency(value: string, mult: number): string {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) {
    return value;
  }

  return `£${Math.round(n * mult).toLocaleString("en-GB")} (demo)`;
}
