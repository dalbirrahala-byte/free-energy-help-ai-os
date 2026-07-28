import { StatCard } from "@/components/dashboard/StatCard";
import type { RenewalPipelineCounts } from "@/lib/renewals/types";

type RenewalPipelineSummaryProps = {
  counts: RenewalPipelineCounts;
  demoEacvTotalLabel: string;
  demoCommissionTotalLabel: string;
};

export function RenewalPipelineSummary({
  counts,
  demoEacvTotalLabel,
  demoCommissionTotalLabel,
}: RenewalPipelineSummaryProps) {
  return (
    <section aria-labelledby="renewal-pipeline-heading">
      <h2 id="renewal-pipeline-heading" className="mb-4 text-lg font-bold text-slate-900">
        30 / 60 / 90 day renewal pipeline
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Within 30 days"
          value={String(counts.within30)}
          hint="Critical urgency (demo)"
        />
        <StatCard
          title="31–60 days"
          value={String(counts.within60)}
          hint="High urgency (demo)"
        />
        <StatCard
          title="61–90 days"
          value={String(counts.within90)}
          hint="Medium urgency (demo)"
        />
        <StatCard
          title="Demo EACV (filtered view)"
          value={demoEacvTotalLabel}
          hint="Estimated annual contract value"
        />
        <StatCard
          title="Demo commission (filtered view)"
          value={demoCommissionTotalLabel}
          hint="Estimated broker commission"
        />
      </div>
    </section>
  );
}
