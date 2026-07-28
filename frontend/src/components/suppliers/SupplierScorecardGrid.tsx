import type { DemoSupplierRecord } from "@/lib/suppliers/types";

import { PreferredBadge, SupplierRiskBadge, SupplierStatusBadge } from "./SupplierBadges";

type SupplierScorecardGridProps = {
  records: DemoSupplierRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function SupplierScorecardGrid({
  records,
  selectedId,
  onSelect,
}: SupplierScorecardGridProps) {
  return (
    <section aria-labelledby="supplier-scorecards">
      <h2 id="supplier-scorecards" className="text-lg font-bold text-slate-900">
        Supplier scorecards
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {records.map((s) => (
          <article
            key={s.id}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              selectedId === s.id ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900">{s.name}</h3>
                <p className="text-sm text-slate-500">{s.category}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <PreferredBadge preferred={s.preferred} />
                <SupplierStatusBadge status={s.status} />
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <ScoreItem label="Electricity" value={s.electricityAvailable ? "Yes" : "No"} />
              <ScoreItem label="Gas" value={s.gasAvailable ? "Yes" : "No"} />
              <ScoreItem label="SME appetite" value={s.smeAppetite} />
              <ScoreItem label="Corporate" value={s.corporateAppetite} />
              <ScoreItem label="Multi-site" value={s.multiSiteAppetite} />
              <ScoreItem label="Renewables" value={s.renewableOptions} />
              <ScoreItem label="Quote turnaround" value={s.avgQuoteTurnaround} />
              <ScoreItem label="Acceptance" value={s.quoteAcceptanceRate} />
              <ScoreItem label="Contract success" value={s.contractSuccessRate} />
              <ScoreItem label="Commission rate" value={s.avgCommissionRate} />
              <ScoreItem label="Payment days" value={s.avgPaymentDays} />
              <ScoreItem label="Service rating" value={s.serviceRating} />
            </dl>
            <div className="mt-3 flex items-center justify-between">
              <SupplierRiskBadge level={s.riskRating} />
              <span className="text-xs text-slate-500">Reviewed {s.lastReviewed}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className="mt-4 w-full rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              View supplier
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScoreItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
