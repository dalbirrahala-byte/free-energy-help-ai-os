import type { BusinessEnergyMarketSignal } from "@/lib/market-intelligence/businessEnergyMarketSignals";

const SEVERITY_STYLES: Record<BusinessEnergyMarketSignal["severity"], string> = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function LeadMarketSignalsCard({
  signals,
}: {
  signals: BusinessEnergyMarketSignal[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Market & Contact Signals</h2>
      <p className="mt-1 text-sm text-slate-500">
        Deterministic signals from this lead&apos;s own notes/source detail, using FEH&apos;s manually researched UK
        business-energy vocabulary. No live Reddit data, no AI inference and no automatic outreach.
      </p>

      {signals.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No research-backed market/contact signals detected in the recorded lead text.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {signals.map((signal) => (
            <article key={signal.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{signal.label}</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[signal.severity]}`}>
                  {signal.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                <span className="font-semibold">CRM capture:</span> {signal.crmPrompt}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-semibold">Revenue action:</span> {signal.revenueAction}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Matched recorded wording: {signal.matchedTerms.join(", ")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
