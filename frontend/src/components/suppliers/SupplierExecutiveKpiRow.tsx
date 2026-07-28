import { StatCard } from "@/components/dashboard/StatCard";
import type { SupplierExecutiveKpis } from "@/lib/suppliers/types";

export function SupplierExecutiveKpiRow({ kpis }: { kpis: SupplierExecutiveKpis }) {
  const cards = [
    { title: "Active suppliers", value: kpis.activeSuppliers },
    { title: "Preferred suppliers", value: kpis.preferredSuppliers },
    { title: "Quotes received this month", value: kpis.quotesThisMonth },
    { title: "Average quote turnaround", value: kpis.avgQuoteTurnaround },
    { title: "Average acceptance rate", value: kpis.avgAcceptanceRate },
    { title: "Average payment time", value: kpis.avgPaymentTime },
    { title: "Commission outstanding", value: kpis.commissionOutstanding },
    { title: "Suppliers requiring review", value: kpis.suppliersRequiringReview },
  ];

  return (
    <section aria-labelledby="supplier-exec-kpis">
      <h2 id="supplier-exec-kpis" className="text-lg font-bold text-slate-900">
        Executive supplier KPIs
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} hint="Demo data" />
        ))}
      </div>
    </section>
  );
}
