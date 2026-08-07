import { StatCard } from "@/components/dashboard/StatCard";
import { DemoBadge } from "@/components/customer-360/DemoBadge";
import type { ExecutiveIntelligenceCard, ExecutiveIntelligenceData } from "@/lib/executive-intelligence-dashboard/types";

type ExecutiveIntelligenceDashboardProps = {
  data: ExecutiveIntelligenceData;
};

function IntelligenceStatCard({ card }: { card: ExecutiveIntelligenceCard }) {
  return (
    <div className="relative">
      {card.source === "demo" && (
        <div className="absolute right-3 top-3">
          <DemoBadge compact />
        </div>
      )}
      <StatCard title={card.title} value={card.value} hint={card.hint} />
    </div>
  );
}

export function ExecutiveIntelligenceDashboard({ data }: ExecutiveIntelligenceDashboardProps) {
  return (
    <div className="space-y-8" id="executive-intelligence-dashboard-module" data-module="executive-intelligence-dashboard">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
        <p className="font-semibold">Executive Intelligence Dashboard</p>
        <p className="mt-1">
          Customers, renewals, pipeline, tasks, and activity are live CRM data. Commission,
          risk, and AI recommendation figures are marked &quot;Demo&quot; until those modules are
          connected to live data.
        </p>
      </div>

      <section aria-labelledby="executive-intelligence-heading">
        <h2 id="executive-intelligence-heading" className="mb-4 text-lg font-bold text-slate-900">
          Executive summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.cards.map((card) => (
            <IntelligenceStatCard key={card.id} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}
