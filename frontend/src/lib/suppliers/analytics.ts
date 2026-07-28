import { DEMO_KPI_SUFFIX } from "./constants";
import type { DemoSupplierRecord, PerformanceComparisonMetric, SupplierExecutiveKpis } from "./types";

function parsePercent(value: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function parseDays(value: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function buildSupplierExecutiveKpis(records: DemoSupplierRecord[]): SupplierExecutiveKpis {
  const active = records.filter(
    (r) => r.status === "Active" || r.status === "Preferred" || r.status === "Limited appetite",
  );
  const preferred = records.filter((r) => r.preferred);
  const review = records.filter(
    (r) => r.status === "Under review" || r.status === "Suspended" || r.status === "Temporarily unavailable",
  );

  const acceptanceRates = records
    .map((r) => parsePercent(r.quoteAcceptanceRate))
    .filter((n) => n > 0);
  const avgAccept =
    acceptanceRates.length > 0
      ? (acceptanceRates.reduce((a, b) => a + b, 0) / acceptanceRates.length).toFixed(1)
      : "—";

  const turnarounds = records.map((r) => parseDays(r.avgQuoteTurnaround)).filter((n) => n > 0);
  const avgTurn =
    turnarounds.length > 0
      ? (turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length).toFixed(1)
      : "—";

  const payments = records.map((r) => parseDays(r.avgPaymentDays)).filter((n) => n > 0);
  const avgPay =
    payments.length > 0
      ? (payments.reduce((a, b) => a + b, 0) / payments.length).toFixed(0)
      : "—";

  return {
    activeSuppliers: `${active.length} ${DEMO_KPI_SUFFIX}`,
    preferredSuppliers: `${preferred.length} ${DEMO_KPI_SUFFIX}`,
    quotesThisMonth: `186 ${DEMO_KPI_SUFFIX}`,
    avgQuoteTurnaround: `${avgTurn} days ${DEMO_KPI_SUFFIX}`,
    avgAcceptanceRate: `${avgAccept}% ${DEMO_KPI_SUFFIX}`,
    avgPaymentTime: `${avgPay} days ${DEMO_KPI_SUFFIX}`,
    commissionOutstanding: `£81,700 ${DEMO_KPI_SUFFIX}`,
    suppliersRequiringReview: `${review.length} ${DEMO_KPI_SUFFIX}`,
  };
}

export function buildPerformanceComparisons(
  records: DemoSupplierRecord[],
): PerformanceComparisonMetric[] {
  const metrics: {
    id: string;
    label: string;
    getValue: (r: DemoSupplierRecord) => number;
    getDisplay: (r: DemoSupplierRecord) => string;
  }[] = [
    {
      id: "turnaround",
      label: "Quote turnaround",
      getValue: (r) => parseDays(r.avgQuoteTurnaround),
      getDisplay: (r) => r.avgQuoteTurnaround,
    },
    {
      id: "acceptance",
      label: "Acceptance rate",
      getValue: (r) => parsePercent(r.quoteAcceptanceRate),
      getDisplay: (r) => r.quoteAcceptanceRate,
    },
    {
      id: "win",
      label: "Win rate",
      getValue: (r) => parsePercent(r.winRate),
      getDisplay: (r) => r.winRate,
    },
    {
      id: "commission",
      label: "Commission rate",
      getValue: (r) => parsePercent(r.avgCommissionRate),
      getDisplay: (r) => r.avgCommissionRate,
    },
    {
      id: "payment",
      label: "Payment speed (days)",
      getValue: (r) => parseDays(r.avgPaymentDays),
      getDisplay: (r) => r.avgPaymentDays,
    },
    {
      id: "complaint",
      label: "Complaint level (demo index)",
      getValue: (r) =>
        r.performance.complaintLevel.includes("Low")
          ? 25
          : r.performance.complaintLevel.includes("Medium")
            ? 55
            : 80,
      getDisplay: (r) => r.performance.complaintLevel,
    },
    {
      id: "renewal",
      label: "Renewal success",
      getValue: (r) => parsePercent(r.performance.renewalSuccess),
      getDisplay: (r) => r.performance.renewalSuccess,
    },
    {
      id: "service",
      label: "Service quality",
      getValue: (r) => parsePercent(r.serviceRating) * 20,
      getDisplay: (r) => r.serviceRating,
    },
  ];

  return metrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    suppliers: records
      .map((r) => ({
        supplierId: r.id,
        name: r.name,
        value: metric.getValue(r),
        display: metric.getDisplay(r),
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value),
  }));
}
