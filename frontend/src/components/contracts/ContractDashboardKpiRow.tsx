import { StatCard } from "@/components/dashboard/StatCard";
import type { ContractDashboardKpis } from "@/lib/contracts/types";

type ContractDashboardKpisProps = {
  kpis: ContractDashboardKpis;
};

export function ContractDashboardKpiRow({ kpis }: ContractDashboardKpisProps) {
  const cards = [
    { title: "Active contracts", value: kpis.activeContracts },
    { title: "Due within 30 days", value: kpis.due30, hint: "Demo as-of 28 Jul 2026" },
    { title: "Due within 60 days", value: kpis.due60 },
    { title: "Due within 90 days", value: kpis.due90 },
    { title: "Out-of-contract customers", value: kpis.outOfContract },
    { title: "Signed this month", value: kpis.signedThisMonth },
    { title: "Lost contracts", value: kpis.lostContracts },
    { title: "Est. demo retained revenue", value: kpis.demoRetainedRevenue },
  ];

  return (
    <section aria-labelledby="contract-dashboard-kpis">
      <h2 id="contract-dashboard-kpis" className="text-lg font-bold text-slate-900">
        Contract dashboard
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} hint={card.hint} />
        ))}
      </div>
    </section>
  );
}
