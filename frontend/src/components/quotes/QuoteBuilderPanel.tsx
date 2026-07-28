import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoQuoteBuilder } from "@/lib/quotes/types";

type QuoteBuilderPanelProps = {
  builder: DemoQuoteBuilder;
};

const FIELDS: { key: keyof DemoQuoteBuilder; label: string }[] = [
  { key: "reference", label: "Quote reference" },
  { key: "customer", label: "Customer" },
  { key: "site", label: "Site" },
  { key: "electricity", label: "Electricity" },
  { key: "gas", label: "Gas" },
  { key: "contractLength", label: "Contract length" },
  { key: "meterType", label: "Meter type" },
  { key: "estimatedAnnualKwh", label: "Estimated annual kWh" },
  { key: "standingCharge", label: "Standing charge" },
  { key: "unitRates", label: "Unit rates" },
  { key: "brokerCommission", label: "Broker commission" },
  { key: "expectedMargin", label: "Expected margin" },
  { key: "estimatedCustomerSaving", label: "Estimated customer saving" },
];

export function QuoteBuilderPanel({ builder }: QuoteBuilderPanelProps) {
  return (
    <SectionCard
      title="Quote builder"
      description="Active quote QTE-2026-0147 — read-only demo configuration"
    >
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </dt>
            <dd className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              {builder[key]}
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
