import { StatCard } from "@/components/dashboard/StatCard";
import type { DemoPricingSummary } from "@/lib/quotes/types";

type PricingSummaryPanelProps = {
  pricing: DemoPricingSummary;
};

export function PricingSummaryPanel({ pricing }: PricingSummaryPanelProps) {
  return (
    <section aria-labelledby="pricing-summary-heading">
      <h2 id="pricing-summary-heading" className="text-lg font-bold text-slate-900">
        Pricing summary
      </h2>
      <p className="mt-1 text-sm text-slate-500">Selected supplier scenario — demo figures only</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Estimated annual cost" value={pricing.estimatedAnnualCost} />
        <StatCard title="Estimated saving" value={pricing.estimatedSaving} />
        <StatCard title="Broker revenue" value={pricing.brokerRevenue} />
        <StatCard title="Margin %" value={pricing.marginPct} />
        <StatCard title="Customer benefit" value={pricing.customerBenefit} />
      </div>
    </section>
  );
}
