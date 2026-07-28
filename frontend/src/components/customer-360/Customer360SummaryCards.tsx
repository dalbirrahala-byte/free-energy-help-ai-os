import { StatCard } from "@/components/dashboard/StatCard";
import type { ExecutiveSummary } from "@/lib/customer-360/types";

type Customer360SummaryCardsProps = {
  summary: ExecutiveSummary;
};

export function Customer360SummaryCards({ summary }: Customer360SummaryCardsProps) {
  const cards = [
    { title: "Active contracts", value: summary.activeContracts, hint: "Demo register" },
    { title: "Sites", value: summary.sites, hint: "Live CRM count" },
    { title: "Electricity meters", value: summary.electricityMeters, hint: "Demo register" },
    { title: "Gas meters", value: summary.gasMeters, hint: "Demo register" },
    { title: "Open quotes", value: summary.openQuotes, hint: "Demo register" },
    { title: "Tasks due", value: summary.tasksDue, hint: "Open tasks (live)" },
    { title: "Renewals due", value: summary.renewalsDue, hint: "Live sites + demo" },
    {
      title: "Outstanding demo commission",
      value: summary.outstandingDemoCommission,
      hint: "Not live financial data",
    },
  ];

  return (
    <section aria-labelledby="customer-360-summary-heading">
      <h3 id="customer-360-summary-heading" className="sr-only">
        Executive summary
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} hint={card.hint} />
        ))}
      </div>
    </section>
  );
}
